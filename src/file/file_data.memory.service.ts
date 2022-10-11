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
      this._files[file.id] = file;
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

      this.files[id] = fileDetails;

      return fileDetails;
    });

    return files;
  }

  async getFileList(
    page = 1,
    pagination = 20,
    options?: GetFileListOptions,
  ): Promise<FileListOutput> {
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

  async getFileById(id: string): Promise<FileDetails> {
    const file = this.files[id];

    if (isNullOrUndefined(file)) {
      throw new NotFoundError('File Not Found');
    }

    return file;
  }

  async deleteFiles(ids: string[]): Promise<DeleteDetails[]> {
    const output: DeleteDetails[] = [];

    for (const id of ids) {
      const file = this.files[id];
      if (!isNullOrUndefined(file)) {
        delete this.files[id];
        output.push({
          id,
          fileDetails: file,
        });
      } else {
        output.push({
          id,
          fileDetails: null,
          error: 'File Does Not Exist',
        });
      }
    }

    return output;
  }
}
