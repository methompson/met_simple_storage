import { Injectable } from '@nestjs/common';
import { FileDetails, NewFileDetails } from '@/src/models/file_models';

export interface DeleteFileOptions {
  id?: string;
  filename?: string;
  originalFilename?: string;
}

export enum FileSortOption {
  Filename = 'Filename',
  DateAdded = 'DateAdded',
}

export interface GetFileListOptions {
  sortBy?: FileSortOption;
}

export interface FileListOutput {
  files: FileDetails[];
  morePages: boolean;
}

@Injectable()
export abstract class FileDataService {
  abstract getFileByName(name: string): Promise<FileDetails>;

  abstract getFileList(
    page: number,
    pagination: number,
    options?: GetFileListOptions,
  ): Promise<FileListOutput>;

  abstract deleteFile(options: DeleteFileOptions): Promise<FileDetails>;

  abstract addFiles(fileDetails: NewFileDetails[]): Promise<FileDetails[]>;
}
