import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Collection, Document } from 'mongodb';

import {
  DeleteDetails,
  FileDataService,
  FileListOutput,
  FileSortOption,
  GetFileListOptions,
} from '@/src/file/file_data.service';
import { FileDetails, NewFileDetails } from '@/src/models/file_models';

import { InvalidInputError, NotFoundError } from '@/src/errors';
import { MongoDBClient } from '@/src/utils/mongodb_client_class';
import { isNullOrUndefined } from '@/src/utils/type_guards';

export const fileCollectionName = 'files';

@Injectable()
export class MongoFileDataService implements FileDataService {
  constructor(protected _mongoDBClient: MongoDBClient) {}

  protected get fileCollection(): Promise<Collection<Document>> {
    return this._mongoDBClient.db.then((db) =>
      db.collection(fileCollectionName),
    );
  }

  public get mongoDBClient() {
    return this._mongoDBClient;
  }

  protected async containsFileCollection(): Promise<boolean> {
    const db = await this._mongoDBClient.db;
    const collections = await db.collections();

    let containsFiles = false;
    collections.forEach((col) => {
      if (col.collectionName === fileCollectionName) {
        containsFiles = true;
      }
    });

    return containsFiles;
  }

  protected async makeFileCollection() {
    console.log('Making File Collection');
    const db = await this._mongoDBClient.db;

    // Enforce required values
    const fileCollection = await db.createCollection(fileCollectionName, {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: [
            'originalFilename',
            'filename',
            'dateAdded',
            'authorId',
            'mimetype',
            'size',
            'isPrivate',
          ],
          properties: {
            originalFilename: {
              bsonType: 'string',
              description: 'originalFilename is required and must be a String',
            },
            filename: {
              bsonType: 'string',
              description: 'filename is required and must be a String',
            },
            dateAdded: {
              bsonType: 'date',
              description: 'dateAdded is required and must be a Date',
            },
            authorId: {
              bsonType: 'string',
              description: 'authorId is required and must be a String',
            },
            mimetype: {
              bsonType: 'string',
              description: 'mimetype is required and must be an String',
            },
            size: {
              bsonType: 'int',
              description: 'size is required and must be an Integer',
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
    await fileCollection.createIndex({ filename: 1 });
  }

  async addFiles(fileDetails: NewFileDetails[]): Promise<FileDetails[]> {
    if (fileDetails.length === 0) {
      throw new InvalidInputError('fileDetails must contain a value');
    }

    // Conforming details to fit MongoDB
    const details = fileDetails.map((fileDetail) => fileDetail.toMongo());

    const fileCollection = await this.fileCollection;

    const results = await fileCollection.insertMany(details, {
      ordered: true,
    });

    if (!results.acknowledged || results.insertedCount != fileDetails.length) {
      throw new Error('Upload error');
    }

    // Conforming output to match JSON
    const output = details.map((detail) => FileDetails.fromMongoDB(detail));

    return output;
  }

  async getFileList(options?: GetFileListOptions): Promise<FileListOutput> {
    const page = options?.page ?? 1;
    const pagination = options?.pagination ?? 20;

    const $skip = pagination * (page - 1);

    let $sort: Record<string, number> = { dateAdded: -1 };

    if (options?.sortBy === FileSortOption.Filename) {
      $sort = { originalFilename: 1 };
    }

    const fileCollection = await this.fileCollection;
    const rawAggregation = fileCollection.aggregate([
      { $sort },
      { $skip },
      { $limit: pagination + 1 },
    ]);

    const aggregation = await rawAggregation.toArray();

    const output = [];

    for (const agg of aggregation) {
      try {
        output.push(FileDetails.fromMongoDB(agg));
      } catch (e) {
        console.error('Invalid File', e);
      }
    }

    // We check if there are more posts than the pagination value.
    // If there are, that means the user can hit 'next' and get more posts.
    const morePages = output.length > pagination;

    return {
      files: output.slice(0, pagination),
      morePages,
    };
  }

  async getFileByName(name: string): Promise<FileDetails> {
    const fileCollection = await this.fileCollection;
    const result = await fileCollection.findOne({ filename: name });

    if (result === null) {
      throw new NotFoundError('Result is null');
    }

    return FileDetails.fromMongoDB(result);
  }

  async deleteFiles(names: string[]): Promise<Record<string, DeleteDetails>> {
    const output: Record<string, DeleteDetails> = {};

    const collection = await this.fileCollection;

    const ops: Promise<void>[] = names.map(async (filename) => {
      try {
        const result = await collection.findOneAndDelete({ filename });

        if (isNullOrUndefined(result.value)) {
          throw new NotFoundError('File Not Found');
        }

        const fileDetails = FileDetails.fromMongoDB(result.value);
        output[filename] = {
          filename,
          fileDetails,
        };
      } catch (e) {
        let error = 'Internal Server Error';
        if (e instanceof NotFoundError) {
          error = 'File Not Found';
        }

        if (e instanceof InvalidInputError) {
          error = 'Invalid File Details';
        }

        output[filename] = { filename, error };
      }
    });

    await Promise.all(ops);

    return output;
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
