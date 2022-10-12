import { Injectable } from '@nestjs/common';
import {
  FileDetails,
  FileDetailsJSON,
  NewFileDetails,
} from '@/src/models/file_models';

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

export interface FileListOutputJSON {
  files: FileDetailsJSON[];
  morePages: boolean;
}

// Provides information on files deleted
export interface DeleteDetails {
  filename: string;
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

  abstract getFileByName(name: string): Promise<FileDetails>;

  abstract deleteFiles(names: string[]): Promise<DeleteDetails[]>;
}
