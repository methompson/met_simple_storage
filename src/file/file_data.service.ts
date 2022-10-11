import { Injectable } from '@nestjs/common';
import { FileDetails, NewFileDetails } from '@/src/models/file_models';

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

// Provides information on files deleted
export interface DeleteDetails {
  id: string;
  fileDetails: FileDetails | null;
  error?: string;
}

@Injectable()
export abstract class FileDataService {
  abstract addFiles(fileDetails: NewFileDetails[]): Promise<FileDetails[]>;

  abstract getFileList(
    page: number,
    pagination: number,
    options?: GetFileListOptions,
  ): Promise<FileListOutput>;

  abstract getFileById(id: string): Promise<FileDetails>;

  abstract deleteFiles(id: string[]): Promise<DeleteDetails[]>;
}
