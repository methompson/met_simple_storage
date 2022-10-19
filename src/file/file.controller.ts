import * as path from 'path';

import {
  Controller,
  Get,
  Inject,
  Res,
  Req,
  UseInterceptors,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';

import { RequestLogInterceptor } from '@/src/middleware/request_log.interceptor';

import { FileDataService } from '@/src/file/file_data.service';
import { LoggerService } from '@/src/logger/logger.service';

import { NotFoundError } from '@/src/errors';
import { AuthModel } from '@/src/models/auth_model';
import { FileSystemService } from '@/src/file/file_system_service';

function isRejected(
  input: PromiseSettledResult<unknown>,
): input is PromiseRejectedResult {
  return input.status === 'rejected';
}

@UseInterceptors(RequestLogInterceptor)
@Controller()
export class FileController {
  private _savedFilePath = './files';

  constructor(
    private configService: ConfigService,
    @Inject('FILE_SERVICE') private readonly fileService: FileDataService,
    @Inject('LOGGER_SERVICE') private readonly loggerService: LoggerService,
  ) {
    this.init();
  }

  get savedFilePath(): string {
    return this._savedFilePath;
  }

  /**
   * Configures the temp and saved file paths.
   */
  async init() {
    this._savedFilePath =
      this.configService.get('saved_file_path') ?? './files';

    // try {
    //   new FileSystemService().makeDirectory(this._savedFilePath);
    // } catch (e) {
    //   const msg = `Invalid Saved File Path: ${e}`;
    //   // console.error(msg);
    //   this.loggerService.addErrorLog(msg);
    //   process.exit();
    // }
  }

  /**
   * Retrieves a file by the new filename that was generated from the
   * uploadFile function.
   */
  @Get(':filename')
  async getFileByName(
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const auth = (request as any).authModel;
    if (!AuthModel.isAuthModel(auth)) {
      throw new HttpException('', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const filename = request.params?.filename;
    const pathToFile = path.join(this._savedFilePath, filename);

    const [statResult, fileDetailsResult] = await Promise.allSettled([
      new FileSystemService().pathExists(pathToFile),
      this.fileService.getFileByName(filename),
    ]);

    if (isRejected(fileDetailsResult)) {
      this.loggerService.addErrorLog(
        `Error Getting File: ${fileDetailsResult.reason}`,
      );

      if (auth.authorized) {
        if (fileDetailsResult.reason instanceof NotFoundError) {
          throw new HttpException('File not found', HttpStatus.NOT_FOUND);
        }

        throw new HttpException('', HttpStatus.INTERNAL_SERVER_ERROR);
      } else {
        throw new HttpException('', HttpStatus.BAD_REQUEST);
      }
    }

    if (isRejected(statResult)) {
      this.loggerService.addErrorLog(
        `Error Getting File: ${statResult.reason}`,
      );

      if (auth.authorized) {
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      } else {
        throw new HttpException('', HttpStatus.BAD_REQUEST);
      }
    }

    // parse the file details to determine if the file is private
    if (fileDetailsResult.value.isPrivate && !auth.authorized) {
      // we throw a 400 instead of a 401 just to keep the codes consistent.
      // We don't want to let the user know anything about the files from
      // the error codes.
      throw new HttpException('', HttpStatus.BAD_REQUEST);
    }

    // If we've made it this far, the file exists and the user has rights
    // to it, we will serve it up.

    response.type(fileDetailsResult.value.mimetype);
    response.sendFile(pathToFile);
  }
}
