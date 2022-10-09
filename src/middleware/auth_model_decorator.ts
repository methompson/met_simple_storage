import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AuthModel } from '../models/auth_model';

export interface UserAuthRequest extends Request {
  authModel: AuthModel;
}

export const AuthData = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request?.authModel ?? new AuthModel({});
  },
);

export const UserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const userId = request?.authModel?.userId ?? '';

    return userId;
  },
);
