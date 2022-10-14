import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { LoggerModule } from '@/src/logger/logger.module';
import { FileUploadModule } from '@/src/file/file.module';

import { mongodbConfiguration } from '@/src/config/mongodb_configuration';
import { logConfiguration } from '@/src/config/log_configuration';
import { authConfiguration } from '@/src/config/auth_configuration';
import { fileConfiguration } from '@/src/config/file_configuration';
import { authCheckMiddlewareFactory } from './middleware/auth_check.middleware';

@Module({
  imports: [
    LoggerModule,
    FileUploadModule,
    ConfigModule.forRoot({
      load: [
        mongodbConfiguration,
        logConfiguration,
        authConfiguration,
        fileConfiguration,
      ],
    }),
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(authCheckMiddlewareFactory()).forRoutes('');
  }
}
