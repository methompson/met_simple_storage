import { Request, Response } from 'express';

export abstract class LoggerController {
  abstract addRequestLog(req: Request, res: Response): Promise<void>;

  abstract addLog(msg: unknown): Promise<void>;

  abstract addErrorLog(msg: unknown): Promise<void>;

  abstract addWarningLog(msg: unknown): Promise<void>;

  abstract cycleLogs(): Promise<void>;
}
