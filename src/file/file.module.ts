import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { LoggerModule } from '@/src/logger/logger.module';
import { FileController } from '@/src/file/file.controller';
import { FileAPIController } from '@/src/file/file_api.controller';
import { InMemoryFileDataService } from '@/src/file/file_data.memory.service';
import { MongoFileDataService } from './file_data.mongo.service';

const fileServiceFactory = {
  provide: 'FILE_SERVICE',
  useFactory: async (configService: ConfigService) => {
    const type = configService.get('fileServerType');

    if (type === 'mongo_db') {
      return await MongoFileDataService.initFromConfig(configService);
    }

    return new InMemoryFileDataService();
  },
  inject: [ConfigService],
};

@Module({
  imports: [LoggerModule, ConfigModule],
  controllers: [FileController, FileAPIController],
  providers: [fileServiceFactory],
})
export class FileUploadModule {}
