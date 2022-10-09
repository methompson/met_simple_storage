import {
  Injectable,
  Inject,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';

// eslint-disable-next-line import/no-unresolved
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { LoggerService } from '@/src/logger/logger.service';

@Injectable()
export class RequestLogInterceptor implements NestInterceptor {
  constructor(
    @Inject('LOGGER_SERVICE') protected readonly loggerService: LoggerService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    return next.handle().pipe(
      tap(() => {
        const httpSwitch = context.switchToHttp();
        const req = httpSwitch.getRequest();
        const res = httpSwitch.getResponse();

        this.loggerService.addRequestLog(req, res);
      }),
    );
  }
}
