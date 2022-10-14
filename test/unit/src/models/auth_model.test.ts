import { sign } from 'jsonwebtoken';

import { AuthModel } from '@/src/models/auth_model';

describe('AuthModel', () => {
  describe('token', () => {});
  describe('authorized', () => {});
  describe('isExpired', () => {});
  describe('userId', () => {});
  describe('correctIss', () => {});
  describe('isAuthModel', () => {});
  describe('fromJWTString', () => {
    test('Returns an AuthModel with a valid JWT string', () => {
      const validToken = sign(
        {
          data: 'data',
          iss: 'methompson-site',
          exp: Math.floor(Date.now() / 1000) + 60 * 60,
        },
        'secret',
      );

      const am = AuthModel.fromJWTString(validToken);

      expect(am.token.data).toBe('data');
      expect(am.authorized).toBe(true);
    });

    test('Returns an AuthModel with a valid, albeit expired JWT string', () => {
      const validToken = sign(
        {
          data: 'data',
          iss: 'methompson-site',
          exp: Math.floor(Date.now() / 1000) - 60 * 60,
        },
        'secret',
      );

      const am = AuthModel.fromJWTString(validToken);

      expect(am.token.data).toBe('data');
      expect(am.authorized).toBe(false);
      expect(am.isNotExpired).toBe(false);
    });

    test('Throws an error with an invalid JWT String', () => {
      expect(() => AuthModel.fromJWTString('not a valid token')).toThrow();
    });
  });
});
