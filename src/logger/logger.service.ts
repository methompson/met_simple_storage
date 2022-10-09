import { Injectable } from '@nestjs/common';
import { Request, Response } from 'express';

import { LoggerController } from './logger.controller';

@Injectable()
export class LoggerService {
  constructor(protected loggerControllers: LoggerController[]) {}

  async addRequestLog(req: Request, res: Response): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const logger of this.loggerControllers) {
      promises.push(logger.addRequestLog(req, res));
    }

    try {
      await Promise.all(promises);
    } catch (e) {
      console.error(e);
    }
  }

  async addLog(msg: unknown): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const logger of this.loggerControllers) {
      promises.push(logger.addLog(msg));
    }

    await Promise.all(promises);
  }

  async addErrorLog(msg: unknown): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const logger of this.loggerControllers) {
      promises.push(logger.addLog(msg));
    }

    await Promise.all(promises);
  }

  async addWarningLog(msg: unknown): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const logger of this.loggerControllers) {
      promises.push(logger.addWarningLog(msg));
    }

    await Promise.all(promises);
  }

  async cycleLogs() {
    const promises: Promise<void>[] = [];

    for (const logger of this.loggerControllers) {
      promises.push(logger.cycleLogs());
    }

    try {
      await Promise.all(promises);
    } catch (e) {
      console.error(e);
    }
  }
}
