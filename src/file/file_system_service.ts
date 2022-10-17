import { mkdir, rename, rm, stat } from 'fs/promises';
import * as path from 'path';

import { DeleteFilesJSON } from '@/src/file/file_data.service';

/**
 * The FileService class represents an API to handle file operations. It performs
 * operations such as moving, renaming, deleting and reading files.
 */
export class FileSystemService {
  getNewFileName() {
    throw new Error('unimplemented');
  }

  async pathExists(pathToFile: string) {
    await stat(pathToFile);
  }

  async makeDirectory(path: string) {
    await mkdir(path, {
      recursive: true,
    });
  }

  async moveFile(oldPath: string, newPath: string) {
    await rename(oldPath, newPath);
  }

  async deleteFile(filePath: string) {
    await rm(filePath);
  }

  async deleteFiles(
    filepath: string,
    filenames: string[],
  ): Promise<Record<string, DeleteFilesJSON>> {
    const output: Record<string, DeleteFilesJSON> = {};

    const ops = filenames.map(async (filename) => {
      try {
        await this.deleteFile(path.join(filepath, filename));
        output[filename] = {
          filename,
        };
      } catch (e) {
        output[filename] = {
          filename,
          error: e.toString(),
        };
      }
    });

    await Promise.all(ops);

    return output;
  }

  /**
   * Attempts to roll back any writes that occurred in case of an error
   */
  async rollBackWrites() {
    throw new Error('unimplemented');
  }
}
