import { decode } from 'jsonwebtoken';

import { isRecord, isString } from '@/src/utils/type_guards';
import { InvalidInputError } from '@/src/errors';

export class AuthModel {
  constructor(protected decodedToken: Record<string, unknown> | null) {}

  get token() {
    return {
      ...this.decodedToken,
    };
  }

  // TODO implement this based on token input
  get authorized(): boolean {
    return (
      Object.keys(this.decodedToken).length > 0 &&
      this.isNotExpired &&
      this.correctIss
    );
  }

  get isNotExpired(): boolean {
    const exp = this.decodedToken?.exp ?? 0;
    return exp >= new Date().getTime() / 1000;
  }

  get userId(): string {
    const userId = this.token?.sub;
    if (isString(userId)) {
      return userId;
    }

    return '';
  }

  // Currently we use getAuth and verifyIdToken in auth_check_middleware.
  // We assume that if a token exists, it's properly signed.
  // get properlySigned(): boolean {}

  get correctIss(): boolean {
    const iss = this.decodedToken?.iss ?? '';
    if (!isString(iss)) {
      return false;
    }

    return iss.includes('methompson-site');
  }

  static isAuthModel(input: unknown): input is AuthModel {
    return input instanceof AuthModel;
  }

  static fromJWTString(token: string): AuthModel {
    const decodedToken = decode(token);

    if (!isRecord(decodedToken)) {
      throw new InvalidInputError('Invalid Token');
    }

    return new AuthModel(decodedToken);
  }
}

// This is used only to skip authorization checks. It always returns true
// for users, whether they're authenticated or not. Should only be used
// for testing.
export class NoAuthModel extends AuthModel {
  get authorized(): boolean {
    return true;
  }
}
