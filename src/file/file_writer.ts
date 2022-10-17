/**
 * The FileWriter class represents an API to handle file operations. It performs
 * operations such as moving, renaming, deleting and reading files.
 */
export class FileWriter {
  constructor(private savedFilePath: string) {}

  getNewFileName() {
    throw new Error('unimplemented');
  }

  async moveFile() {
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
