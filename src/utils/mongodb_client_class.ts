import { ConfigService } from '@nestjs/config';
import { Db, MongoClient } from 'mongodb';

import { isString } from '@/src/utils/type_guards';

export class MongoDBClient {
  protected _mongoClient?: MongoClient = null;

  constructor(protected mongoDBUri: string, protected dbName: string) {}

  get mongoClient(): Promise<MongoClient> {
    if (this._mongoClient !== null) {
      return Promise.resolve(this._mongoClient);
    }

    const client = new MongoClient(this.mongoDBUri, {});
    this._mongoClient = client;

    return client.connect();
  }

  get db(): Promise<Db> {
    return this.mongoClient.then((client) => client.db(this.dbName));
  }

  async close() {
    await this._mongoClient?.close();
    this._mongoClient = null;
  }

  static fromConfiguration(configService: ConfigService): MongoDBClient {
    const uri = configService.get('mongoDBUri');
    const dbName = configService.get('mongoDBName');

    if (!isString(uri) || !isString(dbName)) {
      throw new Error('Invalid input');
    }

    const client = new MongoDBClient(uri, dbName);

    return client;
  }
}
