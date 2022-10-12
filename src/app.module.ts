import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { LoggerModule } from '@/src/logger/logger.module';

import { mongodbConfiguration } from '@/src/config/mongodb_configuration';
import { logConfiguration } from '@/src/config/log_configuration';
import { authConfiguration } from '@/src/config/auth_configuration';
import { fileConfiguration } from '@/src/config/file_configuration';

@Module({
  imports: [
    LoggerModule,
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
export class AppModule {}
