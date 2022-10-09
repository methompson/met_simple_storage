import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { decode } from 'jsonwebtoken';
// eslint-disable-next-line import/no-unresolved
import { getAuth } from 'firebase-admin/auth';

import { AuthModel, NoAuthModel } from '@/src/models/auth_model';
import { isRecord } from '@/src/utils/type_guards';
import { UserAuthRequest } from './auth_model_decorator';

@Injectable()
class AuthCheckMiddlware implements NestMiddleware {
  async use(req: UserAuthRequest, res: Response, next: NextFunction) {
    // First we attempt to get authorization from the header. Then we get it from
    // the cookies. If both fail, we get an empty string.
    const authHeader =
      req.header('authorization') ?? req.cookies?.authorization ?? '';

    // console.log('authHeader', authHeader);
    let token = {};

    try {
      token = await getAuth().verifyIdToken(authHeader);
    } catch (e) {
      // uncomment this for more logging
      // console.error('Invalid Authorization Header', e);
    }

    req.authModel = new AuthModel(token);

    next();
  }
}

@Injectable()
class NoAuthCheckMiddlware implements NestMiddleware {
  async use(req: UserAuthRequest, res: Response, next: NextFunction) {
    const authHeader =
      req.header('authorization') ?? req.cookies?.authorization ?? '';

    const decodedPayload = decode(authHeader);

    const token = isRecord(decodedPayload)
      ? decodedPayload
      : {
          sub: 'noAuthSub',
        };

    req.authModel = new NoAuthModel(token);

    next();
  }
}

export function authCheckMiddlewareFactory() {
  let auth = true;
  process.argv.forEach((el) => {
    if (el === 'noauth') {
      auth = false;
    }
  });

  if (auth) {
    return AuthCheckMiddlware;
  }

  console.log('No Auth Middleware Used');

  return NoAuthCheckMiddlware;
}
