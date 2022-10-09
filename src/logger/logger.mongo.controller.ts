import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { Collection, Document } from 'mongodb';

import { LoggerController } from '@/src/logger/logger.controller';
import { MongoDBClient } from '@/src/utils/mongodb_client_class';

const loggingCollectionName = 'logging';

export class MongoLoggerController implements LoggerController {
  constructor(protected mongoDBClient: MongoDBClient) {}

  protected async containsLoggerCollection(): Promise<boolean> {
    const db = await this.mongoDBClient.db;
    const collections = await db.collections();

    let containsLogging = false;
    collections.forEach((col) => {
      if (col.collectionName === loggingCollectionName) {
        containsLogging = true;
      }
    });

    return containsLogging;
  }

  protected async makeLoggerCollection() {
    console.log('Making Logger Collection');
    const db = await this.mongoDBClient.db;

    // Enforce required values
    const blogCollection = await db.createCollection(loggingCollectionName, {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['date', 'logType'],
          properties: {
            date: {
              bsonType: 'date',
              description: 'date is required and must be a Date',
            },
            logType: {
              bsonType: 'string',
              description: 'logType is required and must be a String',
            },
          },
        },
      },
    });

    await blogCollection.createIndex({ date: 1 });
  }

  protected get loggerCollection(): Promise<Collection<Document>> {
    return this.mongoDBClient.db.then((db) =>
      db.collection(loggingCollectionName),
    );
  }

  protected async addLogToDB(msg: string, logType: string, date?: Date) {
    const _date = date ?? new Date();
    const loggerCollection = await this.loggerCollection;
    await loggerCollection.insertOne({
      date: _date,
      message: msg,
      logType,
    });
  }

  async addRequestLog(req: Request, res: Response) {
    const method = req.method;
    const path = req.path;
    const remoteAddress =
      req.header['x-forwarded-for'] ?? req.socket.remoteAddress;

    const _date = new Date();
    const loggerCollection = await this.loggerCollection;
    const statusCode = res.statusCode ?? '';

    await loggerCollection.insertOne({
      date: _date,
      logType: 'request',
      method,
      remoteAddress,
      path,
      statusCode,
    });

    // await this.addLogToDB(`${remoteAddress} - ${method} - ${path}`, 'request');
  }

  async addLog(msg: unknown) {
    return this.addLogToDB(`${msg}`, 'info');
  }

  async addErrorLog(msg: unknown) {
    return this.addLogToDB(`${msg}`, 'error');
  }

  async cycleLogs() {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const col = await this.loggerCollection;
    col.deleteMany({
      date: {
        $lte: twoWeeksAgo,
      },
    });
  }

  async addWarningLog(msg: unknown) {
    return this.addLogToDB(`${msg}`, 'warning');
  }

  static async initFromConfig(
    configService: ConfigService,
  ): Promise<MongoLoggerController> {
    const client = MongoDBClient.fromConfiguration(configService);
    const service = new MongoLoggerController(client);

    if (!(await service.containsLoggerCollection())) {
      console.log('Does not contain a logger Collection');
      await service.makeLoggerCollection();
    }

    return service;
  }
}
