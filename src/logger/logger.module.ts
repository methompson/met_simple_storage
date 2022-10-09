import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { LoggerService } from '@/src/logger/logger.service';
import { LoggerConsoleController } from '@/src/logger/logger.console.controller';
import { MongoLoggerController } from './logger.mongo.controller';
import { LoggerController } from '@/src/logger/logger.controller';
import { LoggerMongoClearTaskService } from './logger.mongo_clear.task';
import { FileLoggerController } from './logger.file.service';

const loggerServiceFactory = {
  provide: 'LOGGER_SERVICE',
  useFactory: async (configService: ConfigService) => {
    const loggerServices: LoggerController[] = [];

    if (configService.get('console_logging')) {
      loggerServices.push(new LoggerConsoleController());
    }

    if (configService.get('db_logging')) {
      loggerServices.push(
        await MongoLoggerController.initFromConfig(configService),
      );
    }

    if (configService.get('file_logging')) {
      console.log('Adding File Logging');
      loggerServices.push(await FileLoggerController.init());
    }

    return new LoggerService(loggerServices);
  },
  inject: [ConfigService],
};

@Module({
  imports: [ConfigModule],
  providers: [loggerServiceFactory, LoggerMongoClearTaskService],
  exports: [loggerServiceFactory],
})
export class LoggerModule {}
