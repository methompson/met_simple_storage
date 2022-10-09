/**
 * The FileWriter class represents an API to handle file files. It performs
 * actions such as converting file files, saving them to a file system,
 * retrieving file files from the file system and deleting them from the
 * file system.
 *
 * It also employs FileMagick to perform conversions so that an file can
 * be compressed and resized into smaller versions.
 */
export class FileWriter {
  constructor(private savedFilePath: string) {}

  getNewFileName() {
    throw new Error('unimplemented');
  }

  async deleteFile() {
    throw new Error('unimplemented');
  }

  /**
   * Attempts to roll back any writes that occurred in case of an error
   */
  async rollBackWrites() {
    throw new Error('unimplemented');
  }
}
