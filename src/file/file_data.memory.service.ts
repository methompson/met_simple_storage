import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import {
  DeleteDetails,
  FileDataService,
  FileListOutput,
  FileSortOption,
  GetFileListOptions,
} from '@/src/file/file_data.service';
import { FileDetails, NewFileDetails } from '@/src/models/file_models';
import { isNullOrUndefined } from '../utils/type_guards';
import { NotFoundError } from '../errors';

@Injectable()
export class InMemoryFileDataService implements FileDataService {
  constructor(files?: FileDetails[]) {
    if (isNullOrUndefined(files)) {
      return;
    }

    for (const file of files) {
      this._files[file.filename] = file;
    }
  }

  protected _files: Record<string, FileDetails> = {};

  get files() {
    return this._files;
  }

  async addFiles(newFileDetails: NewFileDetails[]): Promise<FileDetails[]> {
    const files = newFileDetails.map((nfd) => {
      const id = uuidv4();
      const fileDetails = FileDetails.fromNewFileDetails(id, nfd);

      this.files[fileDetails.filename] = fileDetails;

      return fileDetails;
    });

    return files;
  }

  async getFileList(options?: GetFileListOptions): Promise<FileListOutput> {
    const page = options?.page ?? 1;
    const pagination = options?.pagination ?? 20;

    const stringCompare = (a: string, b: string) => a.localeCompare(b);

    const sortByName = (a: FileDetails, b: FileDetails) =>
      stringCompare(a.originalFilename, b.originalFilename);

    const sortByDate = (a: FileDetails, b: FileDetails) =>
      stringCompare(a.dateAdded.toISOString(), b.dateAdded.toISOString());

    let sortFunction = sortByName;

    if (options?.sortBy === FileSortOption.DateAdded) {
      sortFunction = sortByDate;
    }

    const skip = pagination * (page - 1);
    const end = pagination * page;

    const fileList = Object.values(this.files);
    fileList.sort(sortFunction);

    const totalFiles = fileList.length;

    const files = fileList.slice(skip, end);

    const morePages = end < totalFiles;

    return { files, morePages };
  }

  async getFileByName(name: string): Promise<FileDetails> {
    const file = this.files[name];

    if (isNullOrUndefined(file)) {
      throw new NotFoundError('File Not Found');
    }

    return file;
  }

  async deleteFiles(names: string[]): Promise<Record<string, DeleteDetails>> {
    const output: Record<string, DeleteDetails> = {};

    for (const filename of names) {
      const file = this.files[filename];
      if (!isNullOrUndefined(file)) {
        delete this.files[filename];
        output[filename] = {
          filename,
          fileDetails: file,
        };
      } else {
        output[filename] = {
          filename,
          fileDetails: null,
          error: 'File Does Not Exist In Database',
        };
      }
    }

    return output;
  }
}
