import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

// eslint-disable-next-line import/no-unresolved
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthModel } from '../models/auth_model';

@Injectable()
export class AuthRequiredIncerceptor implements NestInterceptor {
  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    const authModel = request.authModel;
    if (!AuthModel.isAuthModel(authModel)) {
      throw new HttpException(
        'Invalid Autorization Token',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!authModel.authorized) {
      throw new HttpException('Not Authorized', HttpStatus.UNAUTHORIZED);
    }

    const userId = authModel.userId;

    if (userId.length === 0) {
      throw new HttpException(
        'Invalid Autorization Token',
        HttpStatus.BAD_REQUEST,
      );
    }

    return next.handle().pipe(
      tap(() => {
        console.log('auth interceptor');
      }),
    );
  }
}
