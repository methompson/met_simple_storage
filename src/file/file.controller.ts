import { mkdir } from 'fs/promises';

import {
  Controller,
  Get,
  Inject,
  Post,
  Res,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';

import { RequestLogInterceptor } from '@/src/middleware/request_log.interceptor';

import { FileDataService } from '@/src/file/file_data.service';
import { AuthRequiredIncerceptor } from '@/src/middleware/auth_interceptor';
import { UserId } from '@/src/middleware/auth_model_decorator';
import { LoggerService } from '@/src/logger/logger.service';

@UseInterceptors(RequestLogInterceptor)
@Controller({ path: 'api' })
export class FileController {
  private uploadPath: string;
  private savedFilePath: string;

  constructor(
    private configService: ConfigService,
    @Inject('FILE_SERVICE') private readonly fileService: FileDataService,
    @Inject('LOGGER_SERVICE') private readonly loggerService: LoggerService,
  ) {
    this.init();
  }

  /**
   * Configures the temp and saved file paths.
   */
  async init() {
    this.uploadPath = this.configService.get('temp_file_path') ?? '';

    if (this.uploadPath.length > 0) {
      await mkdir(this.uploadPath, {
        recursive: true,
      });
    }

    const savedFilePath = this.configService.get('saved_file_path');
    try {
      await mkdir(savedFilePath, { recursive: true });
    } catch (e) {
      console.error('Invalid Saved File Path');
      process.exit();
    }

    this.savedFilePath = savedFilePath;
  }

  @Get('list')
  @UseInterceptors(AuthRequiredIncerceptor)
  async getFileList(@Req() request: Request): Promise<void> {
    throw new Error('Unimplemented');
  }

  /**
   * Retrieves a file by the new file file name that was generated from the
   * uploadFile function.
   */
  @Get(':fileName')
  async getFileByName(
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    throw new Error('Unimplemented');
  }

  @Post('upload')
  @UseInterceptors(AuthRequiredIncerceptor)
  async uploadFiles(
    @Req() request: Request,
    @UserId() userId: string,
  ): Promise<void> {
    throw new Error('Unimplemented');
  }

  @Post('delete/:fileName')
  @UseInterceptors(AuthRequiredIncerceptor)
  async deleteFile(@Req() request: Request): Promise<void> {
    throw new Error('Unimplemented');
  }
}
