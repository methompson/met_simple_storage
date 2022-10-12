import * as fsPromises from 'fs/promises';

import formidable, { Formidable } from 'formidable';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

import { FileController } from '@/src/file/file.controller';
import { InMemoryFileDataService } from '@/src/file/file_data.memory.service';
import { FileDetails, UploadedFile } from '@/src/models/file_models';
import { LoggerService } from '@/src/logger/logger.service';
import { AuthModel, NoAuthModel } from '@/src/models/auth_model';

type FormidableParseCalback = (
  err: any,
  fields: formidable.Fields,
  files: formidable.Files,
) => void;

jest.mock('fs/promises', () => {
  const mkdir = jest.fn(async () => {});
  const rename = jest.fn(async () => {});
  const rm = jest.fn(async () => {});
  const stat = jest.fn(async () => {});

  return {
    mkdir,
    rename,
    rm,
    stat,
  };
});

jest.mock('formidable', () => {
  function Formidable() {}
  Formidable.prototype.parse = jest.fn(() => {});

  return { Formidable };
});

jest.mock('@nestjs/config', () => {
  function ConfigService() {}
  ConfigService.prototype.get = jest.fn(() => {});

  return { ConfigService };
});

const errorSpy = jest.spyOn(console, 'error');
errorSpy.mockImplementation(() => {});

const parse = Formidable.prototype.parse as jest.Mock<unknown, unknown[]>;

const rename = fsPromises.rename as unknown as jest.Mock<unknown, unknown[]>;
const rm = fsPromises.rm as unknown as jest.Mock<unknown, unknown[]>;
const stat = fsPromises.stat as unknown as jest.Mock<unknown, unknown[]>;
const mkdir = fsPromises.mkdir as unknown as jest.Mock<unknown, unknown[]>;

mkdir.mockImplementation(async () => {});

const testError = 'Test Error ;oasdfkln';

describe('FileController', () => {
  const id1 = '9cc7ca64-5fa4-42ef-b790-67b640c76d28';
  const newFilename1 = 'newFileName1';
  const originalFilename1 = 'originalFileName1';
  const authorId1 = 'bd70a89c-b862-44ad-a980-a884ae9df5ad';
  const size1 = 1024;

  const id2 = '8c17b304-4fbf-477a-be84-05117ed4393e';
  const newFilename2 = 'newFileName2';
  const originalFilename2 = 'originalFileName2';
  const authorId2 = '32ea27be-c5b4-425b-b6ba-c5b67ecf9c63';
  const size2 = 512;

  const file1 = {
    filepath: newFilename1,
    originalFilename: originalFilename1,
    size: size1,
  } as formidable.File;

  const file2 = {
    filepath: newFilename2,
    originalFilename: originalFilename2,
    size: size2,
  } as formidable.File;

  const fileDetails1 = FileDetails.fromJSON({
    id: id1,
    originalFilename: originalFilename1,
    filename: newFilename1,
    dateAdded: new Date(1).toISOString(),
    authorId: authorId1,
    size: size1,
    isPrivate: true,
  });

  const fileDetails2 = FileDetails.fromJSON({
    id: id2,
    originalFilename: originalFilename2,
    filename: newFilename2,
    dateAdded: new Date(2).toISOString(),
    authorId: authorId2,
    size: size2,
    isPrivate: false,
  });

  beforeEach(() => {
    parse.mockReset();
    parse.mockClear();

    rename.mockReset();
    rename.mockClear();

    rm.mockReset();
    rm.mockClear();

    stat.mockReset();
    stat.mockClear();
  });

  const userId = '99c44a1a-2582-4792-9879-45b5e43b0f33';

  describe('getFileList', () => {
    test('Returns a list of files and a morePages value', async () => {
      const fileDataService = new InMemoryFileDataService();
      const fc = new FileController(
        new ConfigService(),
        fileDataService,
        new LoggerService([]),
      );

      const getFilesSpy = jest.spyOn(fileDataService, 'getFileList');
      getFilesSpy.mockImplementationOnce(async () => ({
        files: [fileDetails1, fileDetails2],
        morePages: true,
      }));

      const req = {} as unknown as Request;

      const result = await fc.getFileList(req);

      expect(result).toStrictEqual({
        files: [fileDetails1.toJSON(), fileDetails2.toJSON()],
        morePages: true,
      });
    });

    test('returns an empty array if no files are returned', async () => {
      const fileDataService = new InMemoryFileDataService();
      const fc = new FileController(
        new ConfigService(),
        fileDataService,
        new LoggerService([]),
      );

      const getFilesSpy = jest.spyOn(fileDataService, 'getFileList');
      getFilesSpy.mockImplementationOnce(async () => ({
        files: [],
        morePages: false,
      }));

      const req = {} as unknown as Request;

      const result = await fc.getFileList(req);

      expect(result).toStrictEqual({
        files: [],
        morePages: false,
      });
    });

    test('passes default values to getFileList', async () => {
      const fileDataService = new InMemoryFileDataService();
      const fc = new FileController(
        new ConfigService(),
        fileDataService,
        new LoggerService([]),
      );

      const getFilesSpy = jest.spyOn(fileDataService, 'getFileList');
      getFilesSpy.mockImplementationOnce(async () => ({
        files: [fileDetails1, fileDetails2],
        morePages: true,
      }));

      const req = {} as unknown as Request;

      await fc.getFileList(req);

      expect(getFilesSpy).toHaveBeenCalledTimes(1);
      expect(getFilesSpy).toHaveBeenCalledWith(1, 20);
    });

    test('passes parsed values to getFileList', async () => {
      const fileDataService = new InMemoryFileDataService();
      const fc = new FileController(
        new ConfigService(),
        fileDataService,
        new LoggerService([]),
      );

      const getFilesSpy = jest.spyOn(fileDataService, 'getFileList');
      getFilesSpy.mockImplementationOnce(async () => ({
        files: [fileDetails1, fileDetails2],
        morePages: true,
      }));

      const req = {
        query: {
          page: '11',
          pagination: '23',
        },
      } as unknown as Request;

      await fc.getFileList(req);

      expect(getFilesSpy).toHaveBeenCalledTimes(1);
      expect(getFilesSpy).toHaveBeenCalledWith(11, 23);
    });

    test('passes default values to getFileList', async () => {
      const fileDataService = new InMemoryFileDataService();
      const fc = new FileController(
        new ConfigService(),
        fileDataService,
        new LoggerService([]),
      );

      const getFilesSpy = jest.spyOn(fileDataService, 'getFileList');
      getFilesSpy.mockImplementationOnce(async () => ({
        files: [fileDetails1, fileDetails2],
        morePages: true,
      }));

      const req = {} as unknown as Request;

      await fc.getFileList(req);

      expect(getFilesSpy).toHaveBeenCalledTimes(1);
      expect(getFilesSpy).toHaveBeenCalledWith(1, 20);
    });

    test('Throws an error if getFileList throws an error', async () => {
      const fileDataService = new InMemoryFileDataService();
      const fc = new FileController(
        new ConfigService(),
        fileDataService,
        new LoggerService([]),
      );

      const getFilesSpy = jest.spyOn(fileDataService, 'getFileList');
      getFilesSpy.mockImplementationOnce(async () => {
        throw new Error(testError);
      });

      const req = {} as unknown as Request;

      await expect(() => fc.getFileList(req)).rejects.toThrow();
    });
  });

  describe('getFileById', () => {
    test('Returns a file if the file exists', async () => {
      const fds = new InMemoryFileDataService([fileDetails1, fileDetails2]);
      const fc = new FileController(
        new ConfigService(),
        fds,
        new LoggerService([]),
      );

      stat.mockImplementationOnce(async () => {
        throw new Error(testError);
      });

      const req = {
        authModel: new NoAuthModel(),
        params: {
          name: fileDetails1.filename,
        },
      } as unknown as Request;
      const res = {} as unknown as Response;

      await fc.getFileByName(req, res);
    });
  });

  describe('uploadFiles', () => {
    test('Runs parseFilesAndFields, addFiles and rename', async () => {
      const fileDataService = new InMemoryFileDataService();
      const fc = new FileController(
        new ConfigService(),
        fileDataService,
        new LoggerService([]),
      );

      const req = {} as unknown as Request;

      const file = { file: file1 };
      parse.mockImplementationOnce((a, b: FormidableParseCalback) => {
        b(null, {}, file);
      });

      const parseSpy = jest.spyOn(fc, 'parseFilesAndFields');
      const addFilesSpy = jest.spyOn(fileDataService, 'addFiles');

      await fc.uploadFiles(req, userId);

      expect(addFilesSpy).toHaveBeenCalledTimes(1);
      expect(rename).toHaveBeenCalledTimes(1);
      expect(parseSpy).toHaveBeenCalledTimes(1);
    });

    test('Returns an array of JSON', async () => {
      const fileDataService = new InMemoryFileDataService();
      const fc = new FileController(
        new ConfigService(),
        fileDataService,
        new LoggerService([]),
      );

      const req = {} as unknown as Request;

      const file = { file: file1 };
      parse.mockImplementationOnce((a, b: FormidableParseCalback) => {
        b(null, {}, file);
      });

      const result = await fc.uploadFiles(req, userId);

      expect(result).toMatchObject([
        {
          originalFilename: file1.originalFilename,
          size: file1.size,
          isPrivate: true,
        },
      ]);
    });

    test('Performs operations for multiple files', async () => {
      const fileDataService = new InMemoryFileDataService();
      const fc = new FileController(
        new ConfigService(),
        fileDataService,
        new LoggerService([]),
      );

      const req = {} as unknown as Request;

      const file = { file: [file1, file2] };
      parse.mockImplementationOnce((a, b: FormidableParseCalback) => {
        b(null, {}, file);
      });

      const addFilesSpy = jest.spyOn(fileDataService, 'addFiles');

      const result = await fc.uploadFiles(req, userId);

      expect(result).toMatchObject([
        {
          originalFilename: file1.originalFilename,
          size: file1.size,
          isPrivate: true,
        },
        {
          originalFilename: file2.originalFilename,
          size: file2.size,
          isPrivate: true,
        },
      ]);

      expect(addFilesSpy).toHaveBeenCalledTimes(1);
      expect(rename).toHaveBeenCalledTimes(2);
    });

    test('throws an error if parseFilesAndFields throws an error', async () => {
      const fileDataService = new InMemoryFileDataService();
      const fc = new FileController(
        new ConfigService(),
        fileDataService,
        new LoggerService([]),
      );

      const req = {} as unknown as Request;

      const parseSpy = jest.spyOn(fc, 'parseFilesAndFields');
      const addFilesSpy = jest.spyOn(fileDataService, 'addFiles');

      parseSpy.mockImplementationOnce(() => {
        throw new Error(testError);
      });

      await expect(() => fc.uploadFiles(req, userId)).rejects.toThrow();

      expect(parseSpy).toHaveBeenCalledTimes(1);
      expect(addFilesSpy).toHaveBeenCalledTimes(0);
      expect(rename).toHaveBeenCalledTimes(0);
    });

    test('throws an error if rename throws an error', async () => {
      const fileDataService = new InMemoryFileDataService();
      const fc = new FileController(
        new ConfigService(),
        fileDataService,
        new LoggerService([]),
      );

      const req = {} as unknown as Request;

      const file = { file: file1 };
      parse.mockImplementationOnce((a, b: FormidableParseCalback) => {
        b(null, {}, file);
      });

      const parseSpy = jest.spyOn(fc, 'parseFilesAndFields');
      const addFilesSpy = jest.spyOn(fileDataService, 'addFiles');
      const rollBackSpy = jest.spyOn(fc, 'rollBackWrites');

      rename.mockImplementationOnce(() => {
        throw new Error(testError);
      });

      await expect(() => fc.uploadFiles(req, userId)).rejects.toThrow();

      expect(parseSpy).toHaveBeenCalledTimes(1);
      expect(rename).toHaveBeenCalledTimes(1);
      expect(addFilesSpy).toHaveBeenCalledTimes(0);
      expect(rollBackSpy).toHaveBeenCalledTimes(1);
    });

    test('throws an error if addFiles throws an error', async () => {
      const fileDataService = new InMemoryFileDataService();
      const fc = new FileController(
        new ConfigService(),
        fileDataService,
        new LoggerService([]),
      );

      const req = {} as unknown as Request;

      const file = { file: file1 };
      parse.mockImplementationOnce((a, b: FormidableParseCalback) => {
        b(null, {}, file);
      });

      const parseSpy = jest.spyOn(fc, 'parseFilesAndFields');
      const rollBackSpy = jest.spyOn(fc, 'rollBackWrites');
      const addFilesSpy = jest.spyOn(fileDataService, 'addFiles');

      addFilesSpy.mockImplementationOnce(() => {
        throw new Error(testError);
      });

      await expect(() => fc.uploadFiles(req, userId)).rejects.toThrow();

      expect(parseSpy).toHaveBeenCalledTimes(1);
      expect(rename).toHaveBeenCalledTimes(1);
      expect(addFilesSpy).toHaveBeenCalledTimes(1);
      expect(rollBackSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteFiles', () => {});

  describe('parseFilesAndFields', () => {
    test('returns a file and default ops', async () => {
      const fileDataService = new InMemoryFileDataService();
      const fc = new FileController(
        new ConfigService(),
        fileDataService,
        new LoggerService([]),
      );

      const req = {} as unknown as Request;

      const file = { file: file1 };
      parse.mockImplementationOnce((a, b: FormidableParseCalback) => {
        b(null, {}, file);
      });

      const result = await fc.parseFilesAndFields(req, '');

      expect(parse).toHaveBeenCalledTimes(1);
      expect(parse).toHaveBeenCalledWith(req, expect.anything());

      expect(result).toStrictEqual({
        files: [UploadedFile.fromFormidable(file1)],
        ops: { isPrivate: true },
      });
    });

    test('returns a file with ops set', async () => {
      const fileDataService = new InMemoryFileDataService();
      const fc = new FileController(
        new ConfigService(),
        fileDataService,
        new LoggerService([]),
      );

      const req = {} as unknown as Request;

      const file = { file: file1 };
      const fields = {
        ops: JSON.stringify({ isPrivate: false }),
      };
      parse.mockImplementationOnce((a, b: FormidableParseCalback) => {
        b(null, fields, file);
      });

      const result = await fc.parseFilesAndFields(req, '');

      expect(parse).toHaveBeenCalledTimes(1);
      expect(parse).toHaveBeenCalledWith(req, expect.anything());

      expect(result).toStrictEqual({
        files: [UploadedFile.fromFormidable(file1)],
        ops: { isPrivate: false },
      });
    });

    test('returns files', async () => {
      const fileDataService = new InMemoryFileDataService();
      const fc = new FileController(
        new ConfigService(),
        fileDataService,
        new LoggerService([]),
      );

      const req = {} as unknown as Request;

      const file = { file: [file1, file2] };
      parse.mockImplementationOnce((a, b: FormidableParseCalback) => {
        b(null, {}, file);
      });

      const result = await fc.parseFilesAndFields(req, '');

      expect(parse).toHaveBeenCalledTimes(1);
      expect(parse).toHaveBeenCalledWith(req, expect.anything());

      expect(result).toStrictEqual({
        files: [
          UploadedFile.fromFormidable(file1),
          UploadedFile.fromFormidable(file2),
        ],
        ops: { isPrivate: true },
      });
    });

    test('throws an error if parse returns an error', async () => {
      const fileDataService = new InMemoryFileDataService();
      const fc = new FileController(
        new ConfigService(),
        fileDataService,
        new LoggerService([]),
      );

      const req = {} as unknown as Request;

      parse.mockImplementationOnce((a, b: FormidableParseCalback) => {
        b(new Error(testError), {}, {});
      });

      await expect(() => fc.parseFilesAndFields(req, '')).rejects.toThrow(
        testError,
      );

      expect(parse).toHaveBeenCalledTimes(1);
      expect(parse).toHaveBeenCalledWith(req, expect.anything());
    });

    test('Throws an error if the parsed values are malformed', async () => {
      const fileDataService = new InMemoryFileDataService();
      const fc = new FileController(
        new ConfigService(),
        fileDataService,
        new LoggerService([]),
      );

      const req = {} as unknown as Request;

      const malformedFile = { ...file1 };
      delete malformedFile.size;

      const file = { file: malformedFile };
      parse.mockImplementationOnce((a, b: FormidableParseCalback) => {
        b(null, {}, file);
      });

      await expect(() => fc.parseFilesAndFields(req, '')).rejects.toThrow();

      expect(parse).toHaveBeenCalledTimes(1);
      expect(parse).toHaveBeenCalledWith(req, expect.anything());
    });
  });
});
