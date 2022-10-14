import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Collection, Document, ObjectId } from 'mongodb';

import {
  DeleteDetails,
  FileDataService,
  FileListOutput,
  GetFileListOptions,
} from '@/src/file/file_data.service';
import { FileDetails, NewFileDetails } from '@/src/models/file_models';

import { MongoDBClient } from '@/src/utils/mongodb_client_class';

const fileDataCollectionName = 'file';

@Injectable()
export class MongoFileDataService implements FileDataService {
  constructor(protected _mongoDBClient: MongoDBClient) {}

  protected get fileCollection(): Promise<Collection<Document>> {
    return this._mongoDBClient.db.then((db) =>
      db.collection(fileDataCollectionName),
    );
  }

  public get mongoDBClient() {
    return this._mongoDBClient;
  }

  protected async containsFileCollection(): Promise<boolean> {
    const db = await this._mongoDBClient.db;
    const collections = await db.collections();

    let containsBlog = false;
    collections.forEach((col) => {
      if (col.collectionName === fileDataCollectionName) {
        containsBlog = true;
      }
    });

    return containsBlog;
  }

  protected async makeFileCollection() {
    console.log('Making Blog Collection');
    const db = await this._mongoDBClient.db;

    // Enforce required values
    const fileCollection = await db.createCollection(fileDataCollectionName, {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: [
            'fileId',
            'authorId',
            'files',
            'originalFilename',
            'dateAdded',
            'isPrivate',
          ],
          properties: {
            fileId: {
              bsonType: 'string',
              description: 'fileId is required and must be a String',
            },
            authorId: {
              bsonType: 'string',
              description: 'authorId is required and must be a String',
            },
            files: {
              bsonType: 'array',
              description: 'files is required and must be an Array',
            },
            originalFilename: {
              bsonType: 'string',
              description: 'originalFilename is required and must be a String',
            },
            dateAdded: {
              bsonType: 'date',
              description: 'dateAdded is required and must be a Date',
            },
            isPrivate: {
              bsonType: 'bool',
              description: 'isPrivate is required and must be a Boolean',
            },
          },
        },
      },
    });

    // Creating an index on filenames for searching.
    await fileCollection.createIndex({ 'files.filename': 1 });
  }

  async addFiles(fileDetails: NewFileDetails[]): Promise<FileDetails[]> {
    throw new Error('unimplemented');
  }

  async getFileList(
    page = 1,
    pagination = 10,
    options: GetFileListOptions,
  ): Promise<FileListOutput> {
    throw new Error('unimplemented');
  }

  async getFileByName(name: string): Promise<FileDetails> {
    throw new Error('unimplemented');
  }

  async deleteFiles(ids: string[]): Promise<DeleteDetails[]> {
    throw new Error('unimplemented');
  }

  static async initFromConfig(
    configService: ConfigService,
    testClient?: MongoDBClient,
  ): Promise<MongoFileDataService> {
    // We only use the testClient if NODE_ENV is test
    const client =
      process.env.NODE_ENV === 'test'
        ? testClient ?? MongoDBClient.fromConfiguration(configService)
        : MongoDBClient.fromConfiguration(configService);

    const service = new MongoFileDataService(client);

    if (!(await service.containsFileCollection())) {
      await service.makeFileCollection();
    }

    return service;
  }
}
