import { Injectable } from '@nestjs/common';

import {
  DeleteFileOptions,
  FileDataService,
  FileListOutput,
  GetFileListOptions,
} from '@/src/file/file_data.service';
import { FileDetails, NewFileDetails } from '@/src/models/file_models';

@Injectable()
export class InMemoryFileDataService extends FileDataService {
  async getFileByName(name: string): Promise<FileDetails> {
    throw new Error('unimplemented');
  }

  async getFileList(
    page = 1,
    pagination = 10,
    options: GetFileListOptions,
  ): Promise<FileListOutput> {
    throw new Error('unimplemented');
  }

  async deleteFile(options: DeleteFileOptions): Promise<FileDetails> {
    throw new Error('unimplemented');
  }

  async addFiles(fileDetails: NewFileDetails[]): Promise<FileDetails[]> {
    throw new Error('unimplemented');
  }
}
