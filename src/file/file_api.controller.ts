import * as path from 'path';

import {
  Controller,
  Get,
  Inject,
  Post,
  Req,
  UseInterceptors,
  HttpException,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import formidable, { Formidable } from 'formidable';
import { v4 as uuidv4 } from 'uuid';

import { AuthRequiredIncerceptor } from '@/src/middleware/auth_interceptor';
import { UserId } from '@/src/middleware/auth_model_decorator';
import { RequestLogInterceptor } from '@/src/middleware/request_log.interceptor';

import {
  DeleteResultJSON,
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

import {
  isNullOrUndefined,
  isString,
  isStringArray,
} from '@/src/utils/type_guards';
import { getIntFromString } from '@/src/utils/get_number_from_string';
import { FileSystemService } from '@/src/file/file_system_service';

function isRejected(
  input: PromiseSettledResult<unknown>,
): input is PromiseRejectedResult {
  return input.status === 'rejected';
}

@UseInterceptors(RequestLogInterceptor)
@Controller({ path: 'api' })
export class FileAPIController {
  private _uploadPath = '';
  private _savedFilePath = './files';

  constructor(
    private configService: ConfigService,
    @Inject('FILE_SERVICE') private readonly fileService: FileDataService,
    @Inject('LOGGER_SERVICE') private readonly loggerService: LoggerService,
  ) {
    this.init();
  }

  get uploadPath(): string {
    return this._uploadPath;
  }

  get savedFilePath(): string {
    return this._savedFilePath;
  }

  /**
   * Configures the temp and saved file paths.
   */
  async init() {
    this._uploadPath = this.configService.get('temp_file_path') ?? '';

    if (this._uploadPath.length > 0) {
      try {
        new FileSystemService().makeDirectory(this._uploadPath);
      } catch (e) {
        const msg = `Invalid Upload File Path: ${e}`;
        // console.error(msg);
        this.loggerService.addErrorLog(msg);
        process.exit();
      }
    }

    this._savedFilePath =
      this.configService.get('saved_file_path') ?? './files';

    try {
      new FileSystemService().makeDirectory(this._savedFilePath);
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
      const fileList = await this.fileService.getFileList({ page, pagination });

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

  @Post('upload')
  @UseInterceptors(AuthRequiredIncerceptor)
  async uploadFiles(
    @Req() request: Request,
    @UserId() userId: string,
  ): Promise<FileDetailsJSON[]> {
    let parsedData: ParsedFilesAndFields;

    // Parse uploaded data
    try {
      parsedData = await this.parseFilesAndFields(request, this._uploadPath);
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
            mimetype: dat.mimetype,
            size: dat.size,
            isPrivate: parsedData.ops.isPrivate ?? true,
          }),
        );

        // Move files from temp folder to the new folder with new file name
        const newFilePath = path.join(this._savedFilePath, filename);

        moveOps.push(
          new FileSystemService().moveFile(dat.filepath, newFilePath),
        );
      }

      await Promise.all(moveOps);

      const savedFiles = await this.fileService.addFiles(newFiles);
      return savedFiles.map((f) => f.toJSON());
    } catch (e) {
      await this.rollBackWrites(newFiles, parsedData.files);
      this.loggerService.addErrorLog(`Error uploading files: ${e}`);
      throw new HttpException(
        'Error Uploading Files',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('delete')
  @HttpCode(200)
  @UseInterceptors(AuthRequiredIncerceptor)
  async deleteFiles(@Req() request: Request): Promise<DeleteResultJSON[]> {
    // get file name
    const body = request.body;

    if (!isStringArray(body)) {
      throw new HttpException('Invalid Input', HttpStatus.BAD_REQUEST);
    }

    // Delete the file(s)
    const [deleteFilesDBResult, deleteFilesResult] = await Promise.allSettled([
      this.fileService.deleteFiles(body),
      new FileSystemService().deleteFiles(this._savedFilePath, body),
    ]);

    // If there's an error from the DB
    if (isRejected(deleteFilesDBResult)) {
      this.loggerService.addErrorLog(
        `Error Deleting File: ${deleteFilesDBResult.reason}`,
      );

      throw new HttpException('', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // If there's an error from the file system
    if (isRejected(deleteFilesResult)) {
      this.loggerService.addErrorLog(
        `Error Deleting File: ${deleteFilesResult.reason}`,
      );

      throw new HttpException('', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return body.map((filename): DeleteResultJSON => {
      const output: DeleteResultJSON = { filename, errors: [] };

      const dbResult = deleteFilesDBResult.value[filename];
      if (isNullOrUndefined(dbResult)) {
        const msg = 'Invalid results from db operation';
        this.loggerService.addErrorLog(msg);
        throw new HttpException(msg, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      if (!isNullOrUndefined(dbResult.error)) {
        output.errors.push(dbResult.error);
      }

      if (!isNullOrUndefined(dbResult.fileDetails)) {
        output.fileDetails = dbResult.fileDetails.toJSON();
      }

      const fileSystemResult = deleteFilesResult.value?.[filename];
      if (isNullOrUndefined(fileSystemResult)) {
        const msg = 'Invalid results from file system operation';
        this.loggerService.addErrorLog(msg);
        throw new HttpException(msg, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      if (!isNullOrUndefined(fileSystemResult.error)) {
        output.errors.push(fileSystemResult.error);
      }

      return output;
    });
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
        const newFilePath = path.join(this._savedFilePath, el.filename);
        ops.push(new FileSystemService().deleteFile(newFilePath));
      });

      uploadedFiles.forEach((el) => {
        ops.push(new FileSystemService().deleteFile(el.filepath));
      });

      await Promise.allSettled(ops);
    } catch (e) {
      this.loggerService.addErrorLog(`Unable to roll back writes: ${e}`);
    }
  }
}
