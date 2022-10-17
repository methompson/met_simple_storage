import {
  AggregationCursor,
  Collection,
  Db,
  Document,
  MongoClient,
  ObjectId,
} from 'mongodb';

import {
  MongoFileDataService,
  fileCollectionName,
} from '@/src/file/file_data.mongo.service';
import { MongoDBClient } from '@/src/utils/mongodb_client_class';
import { NewFileDetails } from '@/src/models/file_models';
import { FileSortOption } from '@/src/file/file_data.service';
import { ConfigService } from '@nestjs/config';

jest.mock('mongodb', () => {
  const originalModule = jest.requireActual('mongodb');

  function MockDb() {}
  MockDb.prototype.collection = jest.fn();
  MockDb.prototype.collections = jest.fn();
  MockDb.prototype.createCollection = jest.fn();

  function MockCollection() {
    Object.defineProperty(this, 'collectionName', {
      configurable: true,
      get: jest.fn(),
      set: jest.fn(),
    });
  }
  MockCollection.prototype.aggregate = jest.fn();
  MockCollection.prototype.createIndex = jest.fn();
  MockCollection.prototype.findOne = jest.fn();
  MockCollection.prototype.findOneAndDelete = jest.fn();
  MockCollection.prototype.insertMany = jest.fn();

  const MockMongoClient = jest.fn();

  function MockAggregationCursor() {}
  MockAggregationCursor.prototype.toArray = jest.fn();

  return {
    ...originalModule,
    Db: MockDb,
    MongoClient: MockMongoClient,
    Collection: MockCollection,
    AggregationCursor: MockAggregationCursor,
  };
});

jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

describe('MongoFileDataService', () => {
  const objectId1 = 'abcdef1234567890abcdef12';
  const objectId2 = '1234567890abcdef12345678';

  const originalFilename1 = 'originalFilename1';
  const filename1 = '1e10c7c6-26d8-4a68-8d04-54af93ac9142';
  const dateAdded1 = new Date(1);
  const authorId1 = '123';
  const mimetype1 = 'image/jpeg';
  const size1 = 1024;
  const isPrivate1 = true;
  const nfd1 = new NewFileDetails(
    originalFilename1,
    filename1,
    dateAdded1,
    authorId1,
    mimetype1,
    size1,
    isPrivate1,
  );

  const originalFilename2 = 'originalFilename2';
  const filename2 = '94ee3041-90e9-455c-b124-1eacdfaa3b45';
  const dateAdded2 = new Date(2);
  const authorId2 = '987';
  const mimetype2 = 'application/json';
  const size2 = 512;
  const isPrivate2 = false;
  const nfd2 = new NewFileDetails(
    originalFilename2,
    filename2,
    dateAdded2,
    authorId2,
    mimetype2,
    size2,
    isPrivate2,
  );

  const collection = Db.prototype.collection as unknown as jest.Mock;
  const collections = Db.prototype.collections as unknown as jest.Mock;
  const createCollection = Db.prototype
    .createCollection as unknown as jest.Mock;

  const aggregate = Collection.prototype.aggregate as unknown as jest.Mock;
  const createIndex = Collection.prototype.createIndex as unknown as jest.Mock;
  const findOne = Collection.prototype.findOne as unknown as jest.Mock;
  const findOneAndDelete = Collection.prototype
    .findOneAndDelete as unknown as jest.Mock;
  const insertMany = Collection.prototype.insertMany as unknown as jest.Mock;

  const testError = 'testError aosdjnf';

  const dbName = 'dbName';
  const uri = 'uri';

  let mockCollection: Collection;
  let mockMongoDBClient: MongoDBClient;
  let mockMongoClient: MongoClient;
  let mockDb: Db;

  let mockCollectionSpy: jest.SpyInstance;
  let clientDbSpy: jest.SpyInstance;

  beforeEach(() => {
    collection.mockReset();
    collections.mockReset();
    createCollection.mockReset();

    aggregate.mockReset();
    createIndex.mockReset();
    findOne.mockReset();
    findOneAndDelete.mockReset();
    insertMany.mockReset();

    (AggregationCursor.prototype.toArray as unknown as jest.Mock).mockReset();

    mockMongoClient = new MongoClient(dbName);
    mockDb = new Db(mockMongoClient, dbName);

    mockCollection = new Collection();
    mockCollectionSpy = jest.spyOn(mockDb, 'collection');
    mockCollectionSpy.mockReturnValue(mockCollection);

    mockMongoDBClient = new MongoDBClient(uri, dbName);
    clientDbSpy = jest.spyOn(mockMongoDBClient, 'db', 'get');
    clientDbSpy.mockReturnValue(Promise.resolve(mockDb));
  });

  describe('fileCollection', () => {
    test('Returns the appropriate value', async () => {
      const mockMongoClient = new MongoClient(dbName);
      const mockDb = new Db(mockMongoClient, dbName);

      const mockCollection = new Collection();
      const mockCollectionSpy = jest.spyOn(mockDb, 'collection');
      mockCollectionSpy.mockReturnValue(mockCollection);

      const client = new MongoDBClient(uri, dbName);
      const clientDbSpy = jest.spyOn(client, 'db', 'get');
      clientDbSpy.mockReturnValue(Promise.resolve(mockDb));

      const svc = new MongoFileDataService(client);
      const val = await svc['fileCollection'];

      expect(val).toBe(mockCollection);

      expect(clientDbSpy).toHaveBeenCalledTimes(1);
      expect(mockCollectionSpy).toHaveBeenCalledTimes(1);
    });

    test('Throws an error when collection throws an error', async () => {
      mockCollectionSpy.mockImplementationOnce(async () => {
        throw new Error(testError);
      });

      const svc = new MongoFileDataService(mockMongoDBClient);
      await expect(() => svc['fileCollection']).rejects.toThrow(testError);

      expect(clientDbSpy).toHaveBeenCalledTimes(1);
      expect(mockCollectionSpy).toHaveBeenCalledTimes(1);
    });

    test('Throws an error when _mongoDBClient.db throws an error', async () => {
      clientDbSpy.mockImplementationOnce(async () => {
        throw new Error(testError);
      });

      const svc = new MongoFileDataService(mockMongoDBClient);
      await expect(() => svc['fileCollection']).rejects.toThrow(testError);

      expect(clientDbSpy).toHaveBeenCalledTimes(1);
      expect(mockCollectionSpy).toHaveBeenCalledTimes(0);
    });
  });

  describe('mongoDBClient', () => {
    test('Returns the value assigned to _mongoDBClient', () => {
      const svc = new MongoFileDataService(mockMongoDBClient);
      expect(svc.mongoDBClient).toBe(mockMongoDBClient);
    });
  });

  describe('containsFileCollection', () => {
    test('returns true if the collection is included in the database', async () => {
      const fileDataCol = new Collection<Document>();
      const fileNameSpy = jest.spyOn(fileDataCol, 'collectionName', 'get');
      fileNameSpy.mockReturnValue(fileCollectionName);

      const collection1 = new Collection<Document>();
      const col1NameSpy = jest.spyOn(collection1, 'collectionName', 'get');
      col1NameSpy.mockReturnValue('collection1');

      const collection2 = new Collection<Document>();
      const col2NameSpy = jest.spyOn(collection2, 'collectionName', 'get');
      col2NameSpy.mockReturnValue('collection2');

      const collectionsSpy = jest.spyOn(mockDb, 'collections');
      collectionsSpy.mockImplementationOnce(() =>
        Promise.resolve([fileDataCol, collection1, collection2]),
      );

      const svc = new MongoFileDataService(mockMongoDBClient);
      const result = await svc['containsFileCollection']();

      expect(result).toBe(true);

      expect(clientDbSpy).toHaveBeenCalledTimes(1);
      expect(collectionsSpy).toHaveBeenCalledTimes(1);
      expect(fileNameSpy).toHaveBeenCalledTimes(1);
      expect(col1NameSpy).toHaveBeenCalledTimes(1);
      expect(col2NameSpy).toHaveBeenCalledTimes(1);
    });

    test('returns false if the collection is not included in the database', async () => {
      const collection1 = new Collection<Document>();
      const col1NameSpy = jest.spyOn(collection1, 'collectionName', 'get');
      col1NameSpy.mockReturnValue('collection1');

      const collection2 = new Collection<Document>();
      const col2NameSpy = jest.spyOn(collection2, 'collectionName', 'get');
      col2NameSpy.mockReturnValue('collection2');

      const collectionsSpy = jest.spyOn(mockDb, 'collections');
      collectionsSpy.mockImplementationOnce(() =>
        Promise.resolve([collection1, collection2]),
      );

      const svc = new MongoFileDataService(mockMongoDBClient);
      const result = await svc['containsFileCollection']();

      expect(result).toBe(false);

      expect(clientDbSpy).toHaveBeenCalledTimes(1);
      expect(collectionsSpy).toHaveBeenCalledTimes(1);
      expect(col1NameSpy).toHaveBeenCalledTimes(1);
      expect(col2NameSpy).toHaveBeenCalledTimes(1);
    });

    test('throws an error if _mongoDBClient.db throws an error', async () => {
      const fileDataCol = new Collection<Document>();
      const fileNameSpy = jest.spyOn(fileDataCol, 'collectionName', 'get');
      fileNameSpy.mockReturnValue(fileCollectionName);

      const collection1 = new Collection<Document>();
      const col1NameSpy = jest.spyOn(collection1, 'collectionName', 'get');
      col1NameSpy.mockReturnValue('collection1');

      const collection2 = new Collection<Document>();
      const col2NameSpy = jest.spyOn(collection2, 'collectionName', 'get');
      col2NameSpy.mockReturnValue('collection2');

      clientDbSpy.mockImplementationOnce(() => {
        throw new Error(testError);
      });

      const collectionsSpy = jest.spyOn(mockDb, 'collections');

      const svc = new MongoFileDataService(mockMongoDBClient);
      await expect(() => svc['containsFileCollection']()).rejects.toThrow(
        testError,
      );

      expect(clientDbSpy).toHaveBeenCalledTimes(1);
      expect(collectionsSpy).toHaveBeenCalledTimes(0);
      expect(fileNameSpy).toHaveBeenCalledTimes(0);
      expect(col1NameSpy).toHaveBeenCalledTimes(0);
      expect(col2NameSpy).toHaveBeenCalledTimes(0);
    });

    test('throws an error if db.collections throws an error', async () => {
      const fileDataCol = new Collection<Document>();
      const fileNameSpy = jest.spyOn(fileDataCol, 'collectionName', 'get');
      fileNameSpy.mockReturnValue(fileCollectionName);

      const collection1 = new Collection<Document>();
      const col1NameSpy = jest.spyOn(collection1, 'collectionName', 'get');
      col1NameSpy.mockReturnValue('collection1');

      const collection2 = new Collection<Document>();
      const col2NameSpy = jest.spyOn(collection2, 'collectionName', 'get');
      col2NameSpy.mockReturnValue('collection2');

      const collectionsSpy = jest.spyOn(mockDb, 'collections');
      collectionsSpy.mockImplementation(() => {
        throw new Error(testError);
      });

      const svc = new MongoFileDataService(mockMongoDBClient);
      await expect(() => svc['containsFileCollection']()).rejects.toThrow(
        testError,
      );

      expect(clientDbSpy).toHaveBeenCalledTimes(1);
      expect(collectionsSpy).toHaveBeenCalledTimes(1);
      expect(fileNameSpy).toHaveBeenCalledTimes(0);
      expect(col1NameSpy).toHaveBeenCalledTimes(0);
      expect(col2NameSpy).toHaveBeenCalledTimes(0);
    });
  });

  describe('makeFileCollection', () => {
    test('calls createCollection and createIndex on the DB', async () => {
      const createSpy = jest.spyOn(mockDb, 'createCollection');
      createSpy.mockImplementationOnce(async () => mockCollection);

      const createIndexSpy = jest.spyOn(mockCollection, 'createIndex');

      const svc = new MongoFileDataService(mockMongoDBClient);
      await svc['makeFileCollection']();

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(createIndexSpy).toHaveBeenCalledTimes(1);
      expect(createIndexSpy).toHaveBeenCalledWith({ filename: 1 });
    });

    test('throws an error if _mongoDBClient.db throws an error', async () => {
      clientDbSpy.mockImplementationOnce(() => {
        throw new Error(testError);
      });

      const createSpy = jest.spyOn(mockDb, 'createCollection');
      const createIndexSpy = jest.spyOn(mockCollection, 'createIndex');

      const svc = new MongoFileDataService(mockMongoDBClient);
      await expect(() => svc['makeFileCollection']()).rejects.toThrow(
        testError,
      );

      expect(createSpy).toHaveBeenCalledTimes(0);
      expect(createIndexSpy).toHaveBeenCalledTimes(0);
    });

    test('throws an error if db.createCollection throws an error', async () => {
      const createSpy = jest.spyOn(mockDb, 'createCollection');
      createSpy.mockImplementationOnce(() => {
        throw new Error(testError);
      });

      const createIndexSpy = jest.spyOn(mockCollection, 'createIndex');

      const svc = new MongoFileDataService(mockMongoDBClient);
      await expect(() => svc['makeFileCollection']()).rejects.toThrow(
        testError,
      );

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(createIndexSpy).toHaveBeenCalledTimes(0);
    });

    test('throws an error if db.createIndex throws an error', async () => {
      const createSpy = jest.spyOn(mockDb, 'createCollection');
      createSpy.mockImplementationOnce(async () => mockCollection);

      const createIndexSpy = jest.spyOn(mockCollection, 'createIndex');
      createIndexSpy.mockImplementationOnce(() => {
        throw new Error(testError);
      });

      const svc = new MongoFileDataService(mockMongoDBClient);
      await expect(() => svc['makeFileCollection']()).rejects.toThrow(
        testError,
      );

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(createIndexSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('addFiles', () => {
    test('runs insertMany and returns the values from MongoDB', async () => {
      // InsertMany inserts the IDs into the values passed in, modifying the args in-place
      insertMany.mockImplementationOnce((input: Record<string, unknown>[]) => {
        input.forEach((el) => {
          if (el.originalFilename === originalFilename1) {
            el._id = new ObjectId(objectId1);
          } else if (el.originalFilename === originalFilename2) {
            el._id = new ObjectId(objectId2);
          }
        });

        return {
          acknowledged: true,
          insertedCount: input.length,
        };
      });

      const svc = new MongoFileDataService(mockMongoDBClient);
      const result = await svc.addFiles([nfd1, nfd2]);

      const result1 = result.find(
        (el) => el.originalFilename === originalFilename1,
      );
      const result2 = result.find(
        (el) => el.originalFilename === originalFilename2,
      );

      expect(result1.toJSON()).toMatchObject(nfd1.toJSON());
      expect(result2.toJSON()).toMatchObject(nfd2.toJSON());

      expect(insertMany).toHaveBeenCalledTimes(1);
      expect(insertMany).toHaveBeenCalledWith(
        [
          expect.objectContaining(nfd1.toMongo()),
          expect.objectContaining(nfd2.toMongo()),
        ],
        { ordered: true },
      );
    });

    test('throws an error if an empty array is sent', async () => {
      const svc = new MongoFileDataService(mockMongoDBClient);
      await expect(() => svc.addFiles([])).rejects.toThrow();

      expect(insertMany).toHaveBeenCalledTimes(0);
    });

    test('throws an error if fileCollection throws an error', async () => {
      const svc = new MongoFileDataService(mockMongoDBClient);
      clientDbSpy.mockImplementationOnce(() => {
        throw new Error(testError);
      });

      await expect(() => svc.addFiles([nfd1, nfd2])).rejects.toThrow(testError);
      expect(insertMany).toHaveBeenCalledTimes(0);
    });

    test('throws an error if insertMany throws an error', async () => {
      const svc = new MongoFileDataService(mockMongoDBClient);
      insertMany.mockImplementationOnce(() => {
        throw new Error(testError);
      });

      await expect(() => svc.addFiles([nfd1, nfd2])).rejects.toThrow(testError);

      expect(insertMany).toHaveBeenCalledTimes(1);
      expect(insertMany).toHaveBeenCalledWith(
        [
          expect.objectContaining(nfd1.toMongo()),
          expect.objectContaining(nfd2.toMongo()),
        ],
        { ordered: true },
      );
    });

    test('throws an error if acknowledged is not true', async () => {
      // InsertMany inserts the IDs into the values passed in, modifying the args in-place
      insertMany.mockImplementationOnce((input: Record<string, unknown>[]) => ({
        acknowledged: false,
        insertedCount: input.length,
      }));

      const svc = new MongoFileDataService(mockMongoDBClient);

      await expect(() => svc.addFiles([nfd1, nfd2])).rejects.toThrow(
        'Upload error',
      );

      expect(insertMany).toHaveBeenCalledTimes(1);
      expect(insertMany).toHaveBeenCalledWith(
        [
          expect.objectContaining(nfd1.toMongo()),
          expect.objectContaining(nfd2.toMongo()),
        ],
        { ordered: true },
      );
    });

    test('throws an error if insertedCount is not the same length as fileDetails', async () => {
      // InsertMany inserts the IDs into the values passed in, modifying the args in-place
      insertMany.mockImplementationOnce((input: Record<string, unknown>[]) => ({
        acknowledged: true,
        insertedCount: input.length - 1,
      }));

      const svc = new MongoFileDataService(mockMongoDBClient);

      await expect(() => svc.addFiles([nfd1, nfd2])).rejects.toThrow(
        'Upload error',
      );

      expect(insertMany).toHaveBeenCalledTimes(1);
      expect(insertMany).toHaveBeenCalledWith(
        [
          expect.objectContaining(nfd1.toMongo()),
          expect.objectContaining(nfd2.toMongo()),
        ],
        { ordered: true },
      );
    });

    test('throws an error if the return values do not conform to expectations', async () => {
      // InsertMany inserts the IDs into the values passed in, modifying the args in-place
      insertMany.mockImplementationOnce((input: Record<string, unknown>[]) => ({
        acknowledged: true,
        insertedCount: input.length,
      }));

      const svc = new MongoFileDataService(mockMongoDBClient);

      await expect(() => svc.addFiles([nfd1, nfd2])).rejects.toThrow();

      expect(insertMany).toHaveBeenCalledTimes(1);
      expect(insertMany).toHaveBeenCalledWith(
        [
          expect.objectContaining(nfd1.toMongo()),
          expect.objectContaining(nfd2.toMongo()),
        ],
        { ordered: true },
      );
    });
  });

  describe('getFileList', () => {
    test('Runs aggregate with default values, and returns a list', async () => {
      const cursor = new AggregationCursor<Document>();

      const toArraySpy = jest.spyOn(cursor, 'toArray');
      toArraySpy.mockImplementationOnce(async () => [
        { ...nfd1.toMongo(), _id: new ObjectId(objectId1) },
        { ...nfd2.toMongo(), _id: new ObjectId(objectId2) },
      ]);

      const aggregateSpy = jest.spyOn(mockCollection, 'aggregate');
      aggregateSpy.mockImplementationOnce(() => cursor);

      const svc = new MongoFileDataService(mockMongoDBClient);
      const result = await svc.getFileList();

      expect(result.morePages).toBe(false);
      expect(result.files.length).toBe(2);

      const result1 = result.files.find((el) => el.filename === nfd1.filename);
      const result2 = result.files.find((el) => el.filename === nfd2.filename);

      expect(result1.toJSON()).toMatchObject(nfd1.toJSON());
      expect(result2.toJSON()).toMatchObject(nfd2.toJSON());

      expect(aggregate).toHaveBeenCalledTimes(1);
      expect(aggregate).toHaveBeenCalledWith([
        { $sort: { dateAdded: -1 } },
        { $skip: 0 },
        { $limit: 21 },
      ]);
      expect(toArraySpy).toHaveBeenCalledTimes(1);
    });

    test('Runs aggregate with passed page and pagination values', async () => {
      const cursor = new AggregationCursor<Document>();

      const toArraySpy = jest.spyOn(cursor, 'toArray');
      toArraySpy.mockImplementationOnce(async () => [
        { ...nfd1.toMongo(), _id: new ObjectId(objectId1) },
        { ...nfd2.toMongo(), _id: new ObjectId(objectId2) },
      ]);

      const aggregateSpy = jest.spyOn(mockCollection, 'aggregate');
      aggregateSpy.mockImplementationOnce(() => cursor);

      const svc = new MongoFileDataService(mockMongoDBClient);
      const result = await svc.getFileList({ page: 69, pagination: 96 });

      expect(result.morePages).toBe(false);
      expect(result.files.length).toBe(2);

      const result1 = result.files.find((el) => el.filename === nfd1.filename);
      const result2 = result.files.find((el) => el.filename === nfd2.filename);

      expect(result1.toJSON()).toMatchObject(nfd1.toJSON());
      expect(result2.toJSON()).toMatchObject(nfd2.toJSON());

      expect(aggregate).toHaveBeenCalledTimes(1);
      expect(aggregate).toHaveBeenCalledWith([
        { $sort: { dateAdded: -1 } },
        { $skip: 6528 },
        { $limit: 97 },
      ]);

      expect(toArraySpy).toHaveBeenCalledTimes(1);
    });

    test('Runs aggregate with passed option values', async () => {
      const cursor = new AggregationCursor<Document>();

      const toArraySpy = jest.spyOn(cursor, 'toArray');
      toArraySpy.mockImplementation(async () => [
        { ...nfd1.toMongo(), _id: new ObjectId(objectId1) },
        { ...nfd2.toMongo(), _id: new ObjectId(objectId2) },
      ]);

      const aggregateSpy = jest.spyOn(mockCollection, 'aggregate');
      aggregateSpy.mockImplementation(() => cursor);

      const svc = new MongoFileDataService(mockMongoDBClient);

      await svc.getFileList({ sortBy: FileSortOption.Filename });

      expect(aggregate).toHaveBeenCalledWith([
        { $sort: { originalFilename: 1 } },
        { $skip: 0 },
        { $limit: 21 },
      ]);

      await svc.getFileList({ page: 3 });

      expect(aggregate).toHaveBeenCalledWith([
        { $sort: { dateAdded: -1 } },
        { $skip: 40 },
        { $limit: 21 },
      ]);

      await svc.getFileList({ pagination: 2, page: 7 });

      expect(aggregate).toHaveBeenCalledWith([
        { $sort: { dateAdded: -1 } },
        { $skip: 12 },
        { $limit: 3 },
      ]);
    });

    test('Returns an empty array if there are no results', async () => {
      const cursor = new AggregationCursor<Document>();

      const toArraySpy = jest.spyOn(cursor, 'toArray');
      toArraySpy.mockImplementationOnce(async () => []);

      const aggregateSpy = jest.spyOn(mockCollection, 'aggregate');
      aggregateSpy.mockImplementationOnce(() => cursor);

      const svc = new MongoFileDataService(mockMongoDBClient);
      const result = await svc.getFileList();

      expect(result.files.length).toBe(0);
    });

    test('morePages is dependent on passed in values and returned results', async () => {
      const cursor = new AggregationCursor<Document>();

      const val = { ...nfd1.toMongo(), _id: new ObjectId(objectId1) };

      const toArraySpy = jest.spyOn(cursor, 'toArray');
      toArraySpy.mockImplementationOnce(async () => [
        val,
        val,
        val,
        val,
        val,
        val,
        val,
        val,
        val,
        val,
      ]);

      const aggregateSpy = jest.spyOn(mockCollection, 'aggregate');
      aggregateSpy.mockImplementationOnce(() => cursor);

      const svc = new MongoFileDataService(mockMongoDBClient);
      const result = await svc.getFileList({
        page: 1,
        pagination: 4,
      });

      expect(result.morePages).toBe(true);
      expect(result.files.length).toBe(4);

      expect(aggregate).toHaveBeenCalledTimes(1);
      expect(aggregate).toHaveBeenCalledWith([
        { $sort: { dateAdded: -1 } },
        { $skip: 0 },
        { $limit: 5 },
      ]);
      expect(toArraySpy).toHaveBeenCalledTimes(1);
    });

    test('throws an error if toArray throws an error', async () => {
      const cursor = new AggregationCursor<Document>();

      const toArraySpy = jest.spyOn(cursor, 'toArray');
      toArraySpy.mockImplementationOnce(async () => {
        throw new Error(testError);
      });

      const aggregateSpy = jest.spyOn(mockCollection, 'aggregate');
      aggregateSpy.mockImplementationOnce(() => cursor);

      const svc = new MongoFileDataService(mockMongoDBClient);
      await expect(() => svc.getFileList()).rejects.toThrow();

      expect(aggregate).toHaveBeenCalledTimes(1);
      expect(aggregate).toHaveBeenCalledWith([
        { $sort: { dateAdded: -1 } },
        { $skip: 0 },
        { $limit: 21 },
      ]);
      expect(toArraySpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('getFileByName', () => {
    test('Runs findOne and returns the results', async () => {
      const findOneSpy = jest.spyOn(mockCollection, 'findOne');
      findOneSpy.mockImplementationOnce(() => ({
        ...nfd1.toMongo(),
        _id: new ObjectId(objectId1),
      }));

      const svc = new MongoFileDataService(mockMongoDBClient);
      const result = await svc.getFileByName(nfd1.filename);

      expect(result.toJSON()).toMatchObject(nfd1.toJSON());

      expect(findOneSpy).toHaveBeenCalledTimes(1);
      expect(findOneSpy).toHaveBeenCalledWith({ filename: nfd1.filename });
    });

    test('Throws an error if fileCollection throws an error', async () => {
      const svc = new MongoFileDataService(mockMongoDBClient);
      clientDbSpy.mockImplementationOnce(() => {
        throw new Error(testError);
      });

      await expect(() => svc.getFileByName(nfd1.filename)).rejects.toThrow(
        testError,
      );
      expect(findOne).toHaveBeenCalledTimes(0);
    });

    test('Throws an error if findOne throws an error', async () => {
      const findOneSpy = jest.spyOn(mockCollection, 'findOne');
      findOneSpy.mockImplementationOnce(() => {
        throw new Error(testError);
      });

      const svc = new MongoFileDataService(mockMongoDBClient);
      await expect(() => svc.getFileByName(nfd1.filename)).rejects.toThrow(
        testError,
      );

      expect(findOneSpy).toHaveBeenCalledTimes(1);
      expect(findOneSpy).toHaveBeenCalledWith({ filename: nfd1.filename });
    });

    test('Throws an error if result is null', async () => {
      const findOneSpy = jest.spyOn(mockCollection, 'findOne');
      findOneSpy.mockImplementationOnce(() => null);

      const svc = new MongoFileDataService(mockMongoDBClient);

      await expect(() => svc.getFileByName(nfd1.filename)).rejects.toThrow(
        'Result is null',
      );

      expect(findOneSpy).toHaveBeenCalledTimes(1);
      expect(findOneSpy).toHaveBeenCalledWith({ filename: nfd1.filename });
    });
  });

  describe('deleteFiles', () => {
    test('Runs findOneAndDelete and returns a value', async () => {
      const delSpy = jest.spyOn(mockCollection, 'findOneAndDelete');
      delSpy.mockImplementation(() => ({
        value: {
          ...nfd1.toMongo(),
          _id: new ObjectId(objectId1),
        },
      }));

      const filename = nfd1.filename;

      const svc = new MongoFileDataService(mockMongoDBClient);
      const result = await svc.deleteFiles([filename]);

      expect(Object.keys(result).length).toBe(1);

      expect(result[filename].error).toBeUndefined();
      expect(result[filename].filename).toBe(filename);
      expect(result[filename]?.fileDetails?.toJSON()).toMatchObject(
        nfd1.toJSON(),
      );

      expect(findOneAndDelete).toHaveBeenCalledTimes(1);
      expect(findOneAndDelete).toHaveBeenCalledWith({
        filename: nfd1.filename,
      });
    });

    test('Runs findOneAndDelete for every name passed in', async () => {
      const delSpy = jest.spyOn(mockCollection, 'findOneAndDelete');
      const filename1 = nfd1.filename;
      const filename2 = nfd2.filename;

      delSpy.mockImplementation((el) => {
        let value = null;
        if (el.filename === filename1) {
          value = {
            ...nfd1.toMongo(),
            _id: new ObjectId(objectId1),
          };
        }
        if (el.filename === filename2) {
          value = {
            ...nfd2.toMongo(),
            _id: new ObjectId(objectId2),
          };
        }

        return { value };
      });

      const svc = new MongoFileDataService(mockMongoDBClient);
      const result = await svc.deleteFiles([filename1, filename2]);

      expect(Object.keys(result).length).toBe(2);

      expect(result[filename1].error).toBeUndefined();
      expect(result[filename1].filename).toBe(filename1);
      expect(result[filename1]?.fileDetails?.toJSON()).toMatchObject(
        nfd1.toJSON(),
      );

      expect(result[filename2].error).toBeUndefined();
      expect(result[filename2].filename).toBe(filename2);
      expect(result[filename2]?.fileDetails?.toJSON()).toMatchObject(
        nfd2.toJSON(),
      );

      expect(findOneAndDelete).toHaveBeenCalledTimes(2);
      expect(findOneAndDelete).toHaveBeenNthCalledWith(1, {
        filename: filename1,
      });
      expect(findOneAndDelete).toHaveBeenNthCalledWith(2, {
        filename: filename2,
      });
    });

    test('throws an error if fileCollection throws an error', async () => {
      const svc = new MongoFileDataService(mockMongoDBClient);
      clientDbSpy.mockImplementationOnce(() => {
        throw new Error(testError);
      });

      await expect(() => svc.deleteFiles([nfd1.filename])).rejects.toThrow(
        testError,
      );
      expect(insertMany).toHaveBeenCalledTimes(0);
    });

    test('Returns error result if findOneAndDelete throws an error', async () => {
      const delSpy = jest.spyOn(mockCollection, 'findOneAndDelete');
      delSpy.mockImplementation(() => {
        throw new Error(testError);
      });

      const filename = nfd1.filename;

      const svc = new MongoFileDataService(mockMongoDBClient);
      const result = await svc.deleteFiles([filename]);

      expect(Object.keys(result).length).toBe(1);

      expect(result[filename].error).toBe('Internal Server Error');
      expect(result[filename].filename).toBe(filename);
      expect(result[filename]?.fileDetails).toBeUndefined();

      expect(findOneAndDelete).toHaveBeenCalledTimes(1);
      expect(findOneAndDelete).toHaveBeenCalledWith({
        filename: nfd1.filename,
      });
    });

    test('Returns error result if result from findOneAndDelete is null', async () => {
      const delSpy = jest.spyOn(mockCollection, 'findOneAndDelete');
      delSpy.mockImplementation(() => ({
        value: null,
      }));

      const filename = nfd1.filename;

      const svc = new MongoFileDataService(mockMongoDBClient);
      const result = await svc.deleteFiles([filename]);

      expect(Object.keys(result).length).toBe(1);

      expect(result[filename].error).toBe('File Not Found');
      expect(result[filename].filename).toBe(filename);
      expect(result[filename]?.fileDetails).toBeUndefined();

      expect(findOneAndDelete).toHaveBeenCalledTimes(1);
      expect(findOneAndDelete).toHaveBeenCalledWith({
        filename: nfd1.filename,
      });
    });

    test('Returns error result if the results do not conform to FileDetails', async () => {
      const delSpy = jest.spyOn(mockCollection, 'findOneAndDelete');
      delSpy.mockImplementation(() => ({
        value: {
          ...nfd1.toMongo(),
        },
      }));

      const filename = nfd1.filename;

      const svc = new MongoFileDataService(mockMongoDBClient);
      const result = await svc.deleteFiles([filename]);

      expect(Object.keys(result).length).toBe(1);

      expect(result[filename].error).toBe('Invalid File Details');
      expect(result[filename].filename).toBe(filename);
      expect(result[filename]?.fileDetails).toBeUndefined();

      expect(findOneAndDelete).toHaveBeenCalledTimes(1);
      expect(findOneAndDelete).toHaveBeenCalledWith({
        filename: nfd1.filename,
      });
    });
  });

  describe('initFromConfig', () => {
    test('creates a service with a client. Does not run makeFileCollection if files exists in the collections', async () => {
      const fileDataCol = new Collection<Document>();
      const fileNameSpy = jest.spyOn(fileDataCol, 'collectionName', 'get');
      fileNameSpy.mockReturnValue(fileCollectionName);

      const collection1 = new Collection<Document>();
      const col1NameSpy = jest.spyOn(collection1, 'collectionName', 'get');
      col1NameSpy.mockReturnValue('collection1');

      const collection2 = new Collection<Document>();
      const col2NameSpy = jest.spyOn(collection2, 'collectionName', 'get');
      col2NameSpy.mockReturnValue('collection2');

      const collectionsSpy = jest.spyOn(mockDb, 'collections');
      collectionsSpy.mockImplementationOnce(() =>
        Promise.resolve([fileDataCol, collection1, collection2]),
      );

      const createSpy = jest.spyOn(mockDb, 'createCollection');
      createSpy.mockImplementationOnce(async () => mockCollection);

      await MongoFileDataService.initFromConfig(
        new ConfigService(),
        mockMongoDBClient,
      );

      expect(clientDbSpy).toHaveBeenCalledTimes(1);
      expect(collectionsSpy).toHaveBeenCalledTimes(1);
      expect(fileNameSpy).toHaveBeenCalledTimes(1);
      expect(col1NameSpy).toHaveBeenCalledTimes(1);
      expect(col2NameSpy).toHaveBeenCalledTimes(1);
      expect(createSpy).toHaveBeenCalledTimes(0);
    });

    test('creates a service with a client. Runs makeFileCollection if files does not exist in the collections', async () => {
      const collection1 = new Collection<Document>();
      const col1NameSpy = jest.spyOn(collection1, 'collectionName', 'get');
      col1NameSpy.mockReturnValue('collection1');

      const collection2 = new Collection<Document>();
      const col2NameSpy = jest.spyOn(collection2, 'collectionName', 'get');
      col2NameSpy.mockReturnValue('collection2');

      const collectionsSpy = jest.spyOn(mockDb, 'collections');
      collectionsSpy.mockImplementationOnce(() =>
        Promise.resolve([collection1, collection2]),
      );

      const createSpy = jest.spyOn(mockDb, 'createCollection');
      createSpy.mockImplementationOnce(async () => mockCollection);

      await MongoFileDataService.initFromConfig(
        new ConfigService(),
        mockMongoDBClient,
      );

      expect(clientDbSpy).toHaveBeenCalledTimes(2);
      expect(collectionsSpy).toHaveBeenCalledTimes(1);
      expect(col1NameSpy).toHaveBeenCalledTimes(1);
      expect(col2NameSpy).toHaveBeenCalledTimes(1);
      expect(createSpy).toHaveBeenCalledTimes(1);
    });

    test('Throws an error if createCollection throws an error', async () => {
      const collection1 = new Collection<Document>();
      const col1NameSpy = jest.spyOn(collection1, 'collectionName', 'get');
      col1NameSpy.mockReturnValue('collection1');

      const collection2 = new Collection<Document>();
      const col2NameSpy = jest.spyOn(collection2, 'collectionName', 'get');
      col2NameSpy.mockReturnValue('collection2');

      const collectionsSpy = jest.spyOn(mockDb, 'collections');
      collectionsSpy.mockImplementationOnce(() =>
        Promise.resolve([collection1, collection2]),
      );

      const createSpy = jest.spyOn(mockDb, 'createCollection');
      createSpy.mockImplementationOnce(async () => {
        throw new Error(testError);
      });

      await expect(() =>
        MongoFileDataService.initFromConfig(
          new ConfigService(),
          mockMongoDBClient,
        ),
      ).rejects.toThrow(testError);

      expect(clientDbSpy).toHaveBeenCalledTimes(2);
      expect(collectionsSpy).toHaveBeenCalledTimes(1);
      expect(col1NameSpy).toHaveBeenCalledTimes(1);
      expect(col2NameSpy).toHaveBeenCalledTimes(1);
      expect(createSpy).toHaveBeenCalledTimes(1);
    });

    test('Throws an error if createIndex throws an error', async () => {
      const collection1 = new Collection<Document>();
      const col1NameSpy = jest.spyOn(collection1, 'collectionName', 'get');
      col1NameSpy.mockReturnValue('collection1');

      const collection2 = new Collection<Document>();
      const col2NameSpy = jest.spyOn(collection2, 'collectionName', 'get');
      col2NameSpy.mockReturnValue('collection2');

      const collectionsSpy = jest.spyOn(mockDb, 'collections');
      collectionsSpy.mockImplementationOnce(() =>
        Promise.resolve([collection1, collection2]),
      );

      const createSpy = jest.spyOn(mockDb, 'createCollection');
      createSpy.mockImplementationOnce(async () => mockCollection);

      const createIndexSpy = jest.spyOn(mockCollection, 'createIndex');
      createIndexSpy.mockImplementationOnce(async () => {
        throw new Error(testError);
      });

      await expect(() =>
        MongoFileDataService.initFromConfig(
          new ConfigService(),
          mockMongoDBClient,
        ),
      ).rejects.toThrow(testError);

      expect(clientDbSpy).toHaveBeenCalledTimes(2);
      expect(collectionsSpy).toHaveBeenCalledTimes(1);
      expect(col1NameSpy).toHaveBeenCalledTimes(1);
      expect(col2NameSpy).toHaveBeenCalledTimes(1);
      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(createIndexSpy).toHaveBeenCalledTimes(1);
    });

    test('Throws an error if _mongoDBClient.db throws an error', async () => {
      const fileDataCol = new Collection<Document>();
      const fileNameSpy = jest.spyOn(fileDataCol, 'collectionName', 'get');
      fileNameSpy.mockReturnValue(fileCollectionName);

      const collection1 = new Collection<Document>();
      const col1NameSpy = jest.spyOn(collection1, 'collectionName', 'get');
      col1NameSpy.mockReturnValue('collection1');

      const collection2 = new Collection<Document>();
      const col2NameSpy = jest.spyOn(collection2, 'collectionName', 'get');
      col2NameSpy.mockReturnValue('collection2');

      clientDbSpy.mockImplementationOnce(() => {
        throw new Error(testError);
      });

      const collectionsSpy = jest.spyOn(mockDb, 'collections');

      await expect(() =>
        MongoFileDataService.initFromConfig(
          new ConfigService(),
          mockMongoDBClient,
        ),
      ).rejects.toThrow();

      expect(clientDbSpy).toHaveBeenCalledTimes(1);
      expect(collectionsSpy).toHaveBeenCalledTimes(0);
      expect(fileNameSpy).toHaveBeenCalledTimes(0);
      expect(col1NameSpy).toHaveBeenCalledTimes(0);
      expect(col2NameSpy).toHaveBeenCalledTimes(0);
    });

    test('throws an error if db.collections throws an error', async () => {
      const fileDataCol = new Collection<Document>();
      const fileNameSpy = jest.spyOn(fileDataCol, 'collectionName', 'get');
      fileNameSpy.mockReturnValue(fileCollectionName);

      const collection1 = new Collection<Document>();
      const col1NameSpy = jest.spyOn(collection1, 'collectionName', 'get');
      col1NameSpy.mockReturnValue('collection1');

      const collection2 = new Collection<Document>();
      const col2NameSpy = jest.spyOn(collection2, 'collectionName', 'get');
      col2NameSpy.mockReturnValue('collection2');

      const collectionsSpy = jest.spyOn(mockDb, 'collections');
      collectionsSpy.mockImplementation(() => {
        throw new Error(testError);
      });

      await expect(() =>
        MongoFileDataService.initFromConfig(
          new ConfigService(),
          mockMongoDBClient,
        ),
      ).rejects.toThrow();

      expect(clientDbSpy).toHaveBeenCalledTimes(1);
      expect(collectionsSpy).toHaveBeenCalledTimes(1);
      expect(fileNameSpy).toHaveBeenCalledTimes(0);
      expect(col1NameSpy).toHaveBeenCalledTimes(0);
      expect(col2NameSpy).toHaveBeenCalledTimes(0);
    });
  });
});
