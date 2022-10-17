import * as fsPromises from 'fs/promises';
import { FileHandle } from 'fs/promises';
import { Stats } from 'fs';

import { Request, Response } from 'express';

import { LoggerController } from '@/src/logger/logger.controller';

const FILE_PATH = 'logs';
const FILE_NAME = 'file.log';
const TOTAL_OLD_LOGS = 5;
const MAX_LOG_SIZE_IN_BYTES = 512 * 1024;

// TODO look into a writestream and queue for writing logs

export class FileLoggerController implements LoggerController {
  constructor(protected fileHandle: FileHandle) {}

  get isoTime() {
    return new Date().toISOString();
  }

  async addRequestLog(req: Request, _res: Response) {
    const requestType = req.method;
    const path = req.path;
    const remoteAddress =
      req.header['x-forwarded-for'] ?? req.socket.remoteAddress;

    const msg = `${this.isoTime} - ${remoteAddress} - ${requestType} - ${path}\n`;

    this.fileHandle.write(msg);
  }

  async addLog(msg: unknown) {
    console.log(`${this.isoTime} - addLog - ${msg}`);
  }

  async addErrorLog(msg: unknown) {
    console.error(`${this.isoTime} - addErrorLog - ${msg}`);
  }

  async addWarningLog(msg: unknown) {
    console.warn(`${this.isoTime} - addWarningLog - ${msg}`);
  }

  async cycleLogs() {
    const basePath = `${FILE_PATH}/${FILE_NAME}`;
    const fileStat = await FileLoggerController.getFileStat(basePath);

    // If fileStat is null, we close the old fileHandle (what's it pointing to?)
    // then we create a new one and go from there.
    if (fileStat === null) {
      this.fileHandle.close();
      this.fileHandle = await FileLoggerController.makeFileHandle();
      return;
    }

    // Size in bytes
    const size = fileStat.size;
    if (size < MAX_LOG_SIZE_IN_BYTES) {
      return;
    }
    // console.log(fileStat);

    // Close the current file handle
    this.fileHandle.close();

    // We cycle through all the old logs and
    for (let i = TOTAL_OLD_LOGS - 1; i > 0; i--) {
      const filePath = `${basePath}.${i}`;

      if (await FileLoggerController.fileExists(filePath)) {
        const newFilePath = `${basePath}.${i + 1}`;
        await fsPromises.rename(filePath, newFilePath);
      }
    }

    await fsPromises.rename(basePath, `${basePath}.1`);

    this.fileHandle = await FileLoggerController.makeFileHandle();
  }

  static async getFileStat(filePath: string): Promise<Stats | null> {
    try {
      return await fsPromises.stat(filePath);
    } catch (e) {
      return null;
    }
  }

  static async fileExists(filePath: string): Promise<boolean> {
    const stats = await FileLoggerController.getFileStat(filePath);

    return stats !== null;
  }

  static async makeFileHandle(): Promise<FileHandle> {
    await fsPromises.mkdir(FILE_PATH, {
      recursive: true,
    });

    const filePath = `${FILE_PATH}/${FILE_NAME}`;

    // await FileLoggerController.fileExists(filePath);

    const fileHandle = await fsPromises.open(filePath, 'a');

    return fileHandle;
  }

  static async init(): Promise<FileLoggerController> {
    const fileHandle = await FileLoggerController.makeFileHandle();

    return new FileLoggerController(fileHandle);
  }
}
