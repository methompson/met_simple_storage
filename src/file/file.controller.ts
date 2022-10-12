import { mkdir, rename, rm, stat } from 'fs/promises';
import * as path from 'path';

import {
  Controller,
  Get,
  Inject,
  Post,
  Res,
  Req,
  UseInterceptors,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import formidable, { Formidable } from 'formidable';
import { v4 as uuidv4 } from 'uuid';

import { AuthRequiredIncerceptor } from '@/src/middleware/auth_interceptor';
import { UserId } from '@/src/middleware/auth_model_decorator';
import { RequestLogInterceptor } from '@/src/middleware/request_log.interceptor';

import {
  FileDataService,
  FileListOutputJSON,
} from '@/src/file/file_data.service';
import { LoggerService } from '@/src/logger/logger.service';
import {
  FileDetailsJSON,
  NewFileDetails,
  ParsedFilesAndFields,
  UploadedFile,
} from '@/src/models/file_models';

import { isString } from '@/src/utils/type_guards';
import { getIntFromString } from '@/src/utils/get_number_from_string';
import { NotFoundError } from '@/src/errors';
import { AuthModel } from '../models/auth_model';

function isRejected(
  input: PromiseSettledResult<unknown>,
): input is PromiseRejectedResult {
  return input.status === 'rejected';
}

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
      try {
        await mkdir(this.uploadPath, {
          recursive: true,
        });
      } catch (e) {
        const msg = `Invalid Upload File Path: ${e}`;
        // console.error(msg);
        this.loggerService.addErrorLog(msg);
        process.exit();
      }
    }

    this.savedFilePath = this.configService.get('saved_file_path') ?? './files';

    try {
      await mkdir(this.savedFilePath, { recursive: true });
    } catch (e) {
      const msg = `Invalid Saved File Path: ${e}`;
      // console.error(msg);
      this.loggerService.addErrorLog(msg);
      process.exit();
    }
  }

  @Get('list')
  @UseInterceptors(AuthRequiredIncerceptor)
  async getFileList(@Req() request: Request): Promise<FileListOutputJSON> {
    const pageQP = request.query?.page;
    const paginationQP = request.query?.pagination;

    const page = isString(pageQP) ? getIntFromString(pageQP, 1) : 1;
    const pagination = isString(paginationQP)
      ? getIntFromString(paginationQP, 20)
      : 20;

    try {
      const fileList = await this.fileService.getFileList(page, pagination);

      const files = fileList.files.map((el) => el.toJSON());

      return {
        files,
        morePages: fileList.morePages,
      };
    } catch (e) {
      await this.loggerService.addErrorLog(`Error Getting File List: ${e}`);
      throw new HttpException(
        'Error Getting File List',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Retrieves a file by the new filename that was generated from the
   * uploadFile function.
   */
  @Get(':name')
  async getFileByName(
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const auth = (request as any).authModel;
    if (!AuthModel.isAuthModel(auth)) {
      throw new HttpException('', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const filename = request.params?.name;
    const pathToFile = path.join(this.savedFilePath, filename);

    const [statResult, fileDetails] = await Promise.allSettled([
      stat(pathToFile),
      this.fileService.getFileByName(filename),
    ]);

    if (isRejected(fileDetails)) {
      if (fileDetails.reason instanceof NotFoundError) {
        if (auth.authorized) {
          console.log('');
          throw new HttpException('File not found', HttpStatus.NOT_FOUND);
        } else {
          throw new HttpException('', HttpStatus.BAD_REQUEST);
        }
      }
    }

    if (isRejected(statResult)) {
      if (auth.authorized) {
        console.log('');
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      } else {
        throw new HttpException('', HttpStatus.BAD_REQUEST);
      }
    }

    // TODO parse the file details to determine if the file is private
    // TODO Serve the file
  }

  @Post('upload')
  @UseInterceptors(AuthRequiredIncerceptor)
  async uploadFiles(
    @Req() request: Request,
    @UserId() userId: string,
  ): Promise<FileDetailsJSON[]> {
    let parsedData: ParsedFilesAndFields;

    // Parse uploaded data
    try {
      parsedData = await this.parseFilesAndFields(request, this.uploadPath);
    } catch (e) {
      const msg = isString(e?.message) ? e.message : `${e}`;
      throw new HttpException(msg, HttpStatus.BAD_REQUEST);
    }

    // TODO separate the ops out into a series of functions to reduce function length

    const moveOps: Promise<void>[] = [];
    const newFiles: NewFileDetails[] = [];
    try {
      // TODO Create appropriate NewFileDetails object
      for (const dat of parsedData.files) {
        const filename = uuidv4();

        newFiles.push(
          NewFileDetails.fromJSON({
            originalFilename: dat.originalFilename,
            filename,
            dateAdded: new Date().toISOString(),
            authorId: userId,
            size: dat.size,
            isPrivate: parsedData.ops.isPrivate ?? true,
          }),
        );

        // Move files from temp folder to the new folder with new file name
        const newImagePath = path.join(this.savedFilePath, filename);
        moveOps.push(rename(dat.filepath, newImagePath));
      }

      await Promise.all(moveOps);

      const savedFiles = await this.fileService.addFiles(newFiles);
      return savedFiles.map((f) => f.toJSON());
    } catch (e) {
      await this.rollBackWrites(newFiles, parsedData.files);
      this.loggerService.addErrorLog('Error uploading files: ${e}');
      throw new HttpException(
        'Error Uploading Files',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('delete')
  @UseInterceptors(AuthRequiredIncerceptor)
  async deleteFiles(@Req() request: Request): Promise<void> {
    throw new Error('Unimplemented');
  }

  async parseFilesAndFields(
    req: Request,
    uploadPath: string,
  ): Promise<ParsedFilesAndFields> {
    const options: Partial<formidable.Options> = {
      multiples: true,
    };

    if (uploadPath.length > 0) {
      options.uploadDir = uploadPath;
    }

    const form = new Formidable(options);

    return await new Promise<ParsedFilesAndFields>((resolve, reject) => {
      form.parse(
        req,
        (err, fields: formidable.Fields, files: formidable.Files) => {
          if (err) {
            console.error(err);
            reject(err);
          }

          const opsRaw = isString(fields?.ops) ? fields.ops : '{}';
          const parsedOps = JSON.parse(opsRaw);

          const ops: Record<string, unknown> = {};

          // isPrivate will always be true unless isPrivate is explicitly set to true
          ops.isPrivate = !(parsedOps.isPrivate === false);

          const uploadedFiles: UploadedFile[] = [];

          if (Array.isArray(files.file)) {
            for (const file of files.file) {
              uploadedFiles.push(UploadedFile.fromFormidable(file));
            }
          } else {
            uploadedFiles.push(UploadedFile.fromFormidable(files.file));
          }

          resolve({ files: uploadedFiles, ops });
        },
      );
    });
  }

  async rollBackWrites(files: NewFileDetails[], uploadedFiles: UploadedFile[]) {
    try {
      const ops: Promise<unknown>[] = [];

      files.forEach((el) => {
        const newImagePath = path.join(this.savedFilePath, el.filename);
        ops.push(rm(newImagePath));
      });

      uploadedFiles.forEach((el) => {
        ops.push(rm(el.filepath));
      });

      await Promise.allSettled(ops);
    } catch (e) {
      this.loggerService.addErrorLog(`Unable to roll back writes: ${e}`);
    }
  }
}
