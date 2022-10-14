import * as fsPromises from 'fs/promises';
import * as path from 'path';

import formidable, { Formidable } from 'formidable';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { sign } from 'jsonwebtoken';

import { FileController } from '@/src/file/file.controller';
import { InMemoryFileDataService } from '@/src/file/file_data.memory.service';
import { FileDetails, UploadedFile } from '@/src/models/file_models';
import { LoggerService } from '@/src/logger/logger.service';
import { AuthModel } from '@/src/models/auth_model';
import { HttpException, HttpStatus } from '@nestjs/common';

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
  const mimetype1 = 'image/jpeg';
  const size1 = 1024;

  const id2 = '8c17b304-4fbf-477a-be84-05117ed4393e';
  const newFilename2 = 'newFileName2';
  const originalFilename2 = 'originalFileName2';
  const authorId2 = '32ea27be-c5b4-425b-b6ba-c5b67ecf9c63';
  const mimetype2 = 'application/json';
  const size2 = 512;

  const file1 = {
    filepath: newFilename1,
    originalFilename: originalFilename1,
    mimetype: mimetype1,
    size: size1,
  } as formidable.File;

  const file2 = {
    filepath: newFilename2,
    originalFilename: originalFilename2,
    mimetype: mimetype2,
    size: size2,
  } as formidable.File;

  const fileDetails1 = FileDetails.fromJSON({
    id: id1,
    originalFilename: originalFilename1,
    filename: newFilename1,
    dateAdded: new Date(1).toISOString(),
    authorId: authorId1,
    mimetype: mimetype1,
    size: size1,
    isPrivate: true,
  });

  const fileDetails2 = FileDetails.fromJSON({
    id: id2,
    originalFilename: originalFilename2,
    filename: newFilename2,
    dateAdded: new Date(2).toISOString(),
    authorId: authorId2,
    mimetype: mimetype2,
    size: size2,
    isPrivate: false,
  });

  const validToken = sign(
    {
      data: 'data',
      iss: 'methompson-site',
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    },
    'secret',
  );

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
    test('Returns a file if the file exists, it is public and the user has no authentication', async () => {
      const fds = new InMemoryFileDataService([fileDetails1, fileDetails2]);
      const fc = new FileController(
        new ConfigService(),
        fds,
        new LoggerService([]),
      );

      stat.mockImplementationOnce(async () => {});

      const req = {
        authModel: new AuthModel({}),
        params: {
          filename: fileDetails2.filename,
        },
      } as unknown as Request;

      const sendFile = jest.fn();
      const type = jest.fn();
      const res = { sendFile, type } as unknown as Response;

      const getFileSpy = jest.spyOn(fds, 'getFileByName');

      await fc.getFileByName(req, res);

      expect(getFileSpy).toHaveBeenCalledTimes(1);
      expect(getFileSpy).toHaveBeenCalledWith(fileDetails2.filename);

      const filePath = path.join(fc.savedFilePath, fileDetails2.filename);

      expect(stat).toHaveBeenCalledTimes(1);
      expect(stat).toHaveBeenCalledWith(filePath);

      expect(sendFile).toHaveBeenCalledTimes(1);
      expect(sendFile).toHaveBeenCalledWith(filePath);

      expect(type).toHaveBeenCalledTimes(1);
      expect(type).toHaveBeenCalledWith(fileDetails2.mimetype);
    });

    test('Returns a file if the file exists, it is public and the user is authenticated', async () => {
      const fds = new InMemoryFileDataService([fileDetails1, fileDetails2]);
      const fc = new FileController(
        new ConfigService(),
        fds,
        new LoggerService([]),
      );

      stat.mockImplementationOnce(async () => {});

      const am = AuthModel.fromJWTString(validToken);
      expect(am.authorized).toBe(true);

      const req = {
        authModel: am,
        params: {
          filename: fileDetails2.filename,
        },
      } as unknown as Request;

      const sendFile = jest.fn();
      const type = jest.fn();
      const res = { sendFile, type } as unknown as Response;

      const getFileSpy = jest.spyOn(fds, 'getFileByName');

      await fc.getFileByName(req, res);

      expect(getFileSpy).toHaveBeenCalledTimes(1);
      expect(getFileSpy).toHaveBeenCalledWith(fileDetails2.filename);

      const filePath = path.join(fc.savedFilePath, fileDetails2.filename);

      expect(stat).toHaveBeenCalledTimes(1);
      expect(stat).toHaveBeenCalledWith(filePath);

      expect(sendFile).toHaveBeenCalledTimes(1);
      expect(sendFile).toHaveBeenCalledWith(filePath);

      expect(type).toHaveBeenCalledTimes(1);
      expect(type).toHaveBeenCalledWith(fileDetails2.mimetype);
    });

    test('Returns a file if the file exists, it is private and the user is authenticated', async () => {
      const fds = new InMemoryFileDataService([fileDetails1, fileDetails2]);
      const fc = new FileController(
        new ConfigService(),
        fds,
        new LoggerService([]),
      );

      stat.mockImplementationOnce(async () => {});

      const am = AuthModel.fromJWTString(validToken);
      expect(am.authorized).toBe(true);

      const req = {
        authModel: am,
        params: {
          filename: fileDetails1.filename,
        },
      } as unknown as Request;

      const sendFile = jest.fn();
      const type = jest.fn();
      const res = { sendFile, type } as unknown as Response;

      const getFileSpy = jest.spyOn(fds, 'getFileByName');

      await fc.getFileByName(req, res);

      expect(getFileSpy).toHaveBeenCalledTimes(1);
      expect(getFileSpy).toHaveBeenCalledWith(fileDetails1.filename);

      const filePath = path.join(fc.savedFilePath, fileDetails1.filename);

      expect(stat).toHaveBeenCalledTimes(1);
      expect(stat).toHaveBeenCalledWith(filePath);

      expect(sendFile).toHaveBeenCalledTimes(1);
      expect(sendFile).toHaveBeenCalledWith(filePath);

      expect(type).toHaveBeenCalledTimes(1);
      expect(type).toHaveBeenCalledWith(fileDetails1.mimetype);
    });

    test('Throws an error, if the file exists, the file is private and the user is not authenticated', async () => {
      const fds = new InMemoryFileDataService([fileDetails1, fileDetails2]);
      const fc = new FileController(
        new ConfigService(),
        fds,
        new LoggerService([]),
      );

      stat.mockImplementationOnce(async () => {});

      const req = {
        authModel: new AuthModel({}),
        params: {
          filename: fileDetails1.filename,
        },
      } as unknown as Request;

      const sendFile = jest.fn();
      const res = { sendFile } as unknown as Response;

      const getFileSpy = jest.spyOn(fds, 'getFileByName');

      await expect(() => fc.getFileByName(req, res)).rejects.toThrow(
        new HttpException('', HttpStatus.BAD_REQUEST),
      );

      expect(getFileSpy).toHaveBeenCalledTimes(1);
      expect(getFileSpy).toHaveBeenCalledWith(fileDetails1.filename);

      const filePath = path.join(fc.savedFilePath, fileDetails1.filename);

      expect(stat).toHaveBeenCalledTimes(1);
      expect(stat).toHaveBeenCalledWith(filePath);

      expect(sendFile).toHaveBeenCalledTimes(0);
    });

    test('Throws an error, if the file exists, but has no DB entry, and the user is not authenticated', async () => {
      const fds = new InMemoryFileDataService([fileDetails1, fileDetails2]);
      const fc = new FileController(
        new ConfigService(),
        fds,
        new LoggerService([]),
      );

      stat.mockImplementationOnce(async () => {});

      const testName = 'test name';

      const req = {
        authModel: new AuthModel({}),
        params: {
          filename: testName,
        },
      } as unknown as Request;

      const sendFile = jest.fn();
      const res = { sendFile } as unknown as Response;

      const getFileSpy = jest.spyOn(fds, 'getFileByName');

      await expect(() => fc.getFileByName(req, res)).rejects.toThrow(
        new HttpException('', HttpStatus.BAD_REQUEST),
      );

      expect(getFileSpy).toHaveBeenCalledTimes(1);
      expect(getFileSpy).toHaveBeenCalledWith(testName);

      const filePath = path.join(fc.savedFilePath, testName);

      expect(stat).toHaveBeenCalledTimes(1);
      expect(stat).toHaveBeenCalledWith(filePath);

      expect(sendFile).toHaveBeenCalledTimes(0);
    });

    test('Throws an error, if the file exists, but has no DB entry, and the user is authenticated', async () => {
      const fds = new InMemoryFileDataService([fileDetails1, fileDetails2]);
      const fc = new FileController(
        new ConfigService(),
        fds,
        new LoggerService([]),
      );

      stat.mockImplementationOnce(async () => {});

      const am = AuthModel.fromJWTString(validToken);
      expect(am.authorized).toBe(true);

      const testName = 'test name';

      const req = {
        authModel: am,
        params: {
          filename: testName,
        },
      } as unknown as Request;

      const sendFile = jest.fn();
      const res = { sendFile } as unknown as Response;

      const getFileSpy = jest.spyOn(fds, 'getFileByName');

      await expect(() => fc.getFileByName(req, res)).rejects.toThrow(
        new HttpException('File not found', HttpStatus.NOT_FOUND),
      );

      expect(getFileSpy).toHaveBeenCalledTimes(1);
      expect(getFileSpy).toHaveBeenCalledWith(testName);

      const filePath = path.join(fc.savedFilePath, testName);

      expect(stat).toHaveBeenCalledTimes(1);
      expect(stat).toHaveBeenCalledWith(filePath);

      expect(sendFile).toHaveBeenCalledTimes(0);
    });

    test('Throws an error, if the file has a DB entry, but does not exist, and the user is not authenticated', async () => {
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
        authModel: new AuthModel({}),
        params: {
          filename: fileDetails1.filename,
        },
      } as unknown as Request;

      const sendFile = jest.fn();
      const res = { sendFile } as unknown as Response;

      const getFileSpy = jest.spyOn(fds, 'getFileByName');

      await expect(() => fc.getFileByName(req, res)).rejects.toThrow(
        new HttpException('', HttpStatus.BAD_REQUEST),
      );

      expect(getFileSpy).toHaveBeenCalledTimes(1);
      expect(getFileSpy).toHaveBeenCalledWith(fileDetails1.filename);

      const filePath = path.join(fc.savedFilePath, fileDetails1.filename);

      expect(stat).toHaveBeenCalledTimes(1);
      expect(stat).toHaveBeenCalledWith(filePath);

      expect(sendFile).toHaveBeenCalledTimes(0);
    });

    test('Throws an error, if the file has a DB entry, but does not exist, and the user is authenticated', async () => {
      const fds = new InMemoryFileDataService([fileDetails1, fileDetails2]);
      const fc = new FileController(
        new ConfigService(),
        fds,
        new LoggerService([]),
      );

      stat.mockImplementationOnce(async () => {
        throw new Error(testError);
      });

      const am = AuthModel.fromJWTString(validToken);
      expect(am.authorized).toBe(true);

      const req = {
        authModel: am,
        params: {
          filename: fileDetails1.filename,
        },
      } as unknown as Request;

      const sendFile = jest.fn();
      const res = { sendFile } as unknown as Response;

      const getFileSpy = jest.spyOn(fds, 'getFileByName');

      await expect(() => fc.getFileByName(req, res)).rejects.toThrow(
        new HttpException('File not found', HttpStatus.NOT_FOUND),
      );

      expect(getFileSpy).toHaveBeenCalledTimes(1);
      expect(getFileSpy).toHaveBeenCalledWith(fileDetails1.filename);

      const filePath = path.join(fc.savedFilePath, fileDetails1.filename);

      expect(stat).toHaveBeenCalledTimes(1);
      expect(stat).toHaveBeenCalledWith(filePath);

      expect(sendFile).toHaveBeenCalledTimes(0);
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

  describe('deleteFiles', () => {
    test('Returns a JSON object of data about the deletion', async () => {
      const fds = new InMemoryFileDataService([fileDetails1, fileDetails2]);
      const fc = new FileController(
        new ConfigService(),
        fds,
        new LoggerService([]),
      );

      const req = {
        body: [fileDetails1.filename, fileDetails2.filename],
      } as unknown as Request;

      const result = await fc.deleteFiles(req);
      expect(result.length).toBe(2);

      const result1 = result.find(
        (el) => el.filename === fileDetails1.filename,
      );
      const result2 = result.find(
        (el) => el.filename === fileDetails2.filename,
      );

      expect(result1.fileDetails).toStrictEqual(fileDetails1.toJSON());
      expect(result1.error).toBeUndefined();
      expect(result1.filename).toBe(fileDetails1.filename);

      expect(result2.fileDetails).toStrictEqual(fileDetails2.toJSON());
      expect(result2.error).toBeUndefined();
      expect(result2.filename).toBe(fileDetails2.filename);
    });

    test('Returns error details from fileService.delete files', async () => {
      const badFilename = 'badFilename';
      const fds = new InMemoryFileDataService([fileDetails1, fileDetails2]);
      const fc = new FileController(
        new ConfigService(),
        fds,
        new LoggerService([]),
      );

      const req = {
        body: [fileDetails1.filename, badFilename],
      } as unknown as Request;

      const result = await fc.deleteFiles(req);
      expect(result.length).toBe(2);

      const result1 = result.find(
        (el) => el.filename === fileDetails1.filename,
      );
      const result2 = result.find((el) => el.filename === badFilename);

      expect(result1.fileDetails).toStrictEqual(fileDetails1.toJSON());
      expect(result1.error).toBeUndefined();
      expect(result1.filename).toBe(fileDetails1.filename);

      expect(result2.fileDetails).toBeUndefined();
      expect(result2.error).not.toBeUndefined();
      expect(result2.filename).toBe(badFilename);
    });

    test('Runs several functions with specific inputs', async () => {
      const fds = new InMemoryFileDataService([fileDetails1, fileDetails2]);
      const fc = new FileController(
        new ConfigService(),
        fds,
        new LoggerService([]),
      );

      const body = [fileDetails1.filename, fileDetails2.filename];

      const req = { body } as unknown as Request;

      const deleteFSSpy = jest.spyOn(fds, 'deleteFiles');

      await fc.deleteFiles(req);

      expect(deleteFSSpy).toHaveBeenCalledTimes(1);
      expect(deleteFSSpy).toHaveBeenCalledWith(body);

      expect(rm).toHaveBeenCalledTimes(2);

      const path1 = path.join(fc.savedFilePath, fileDetails1.filename);
      const path2 = path.join(fc.savedFilePath, fileDetails2.filename);
      expect(rm).toHaveBeenCalledWith(path1);
      expect(rm).toHaveBeenCalledWith(path2);
    });

    test('Throws an error if fileService.deleteFiles throws an error', async () => {
      const fds = new InMemoryFileDataService([fileDetails1, fileDetails2]);
      const fc = new FileController(
        new ConfigService(),
        fds,
        new LoggerService([]),
      );

      const body = [fileDetails1.filename, fileDetails2.filename];

      const req = { body } as unknown as Request;

      const deleteFSSpy = jest.spyOn(fds, 'deleteFiles');
      deleteFSSpy.mockImplementationOnce(async () => {
        throw new Error(testError);
      });

      await expect(() => fc.deleteFiles(req)).rejects.toThrow(
        new HttpException('', HttpStatus.BAD_REQUEST),
      );

      expect(deleteFSSpy).toHaveBeenCalledTimes(1);
      expect(deleteFSSpy).toHaveBeenCalledWith(body);

      expect(rm).toHaveBeenCalledTimes(2);

      const path1 = path.join(fc.savedFilePath, fileDetails1.filename);
      const path2 = path.join(fc.savedFilePath, fileDetails2.filename);
      expect(rm).toHaveBeenCalledWith(path1);
      expect(rm).toHaveBeenCalledWith(path2);
    });

    test('Throws an error if deleteFilesFromFileSystem throws an error', async () => {
      const fds = new InMemoryFileDataService([fileDetails1, fileDetails2]);
      const fc = new FileController(
        new ConfigService(),
        fds,
        new LoggerService([]),
      );

      const body = [fileDetails1.filename, fileDetails2.filename];

      const req = { body } as unknown as Request;

      const deleteFSSpy = jest.spyOn(fds, 'deleteFiles');

      rm.mockImplementationOnce(async () => {
        throw new Error(testError);
      });

      await expect(() => fc.deleteFiles(req)).rejects.toThrow(
        new HttpException('', HttpStatus.BAD_REQUEST),
      );

      expect(deleteFSSpy).toHaveBeenCalledTimes(1);
      expect(deleteFSSpy).toHaveBeenCalledWith(body);

      expect(rm).toHaveBeenCalledTimes(2);

      const path1 = path.join(fc.savedFilePath, fileDetails1.filename);
      const path2 = path.join(fc.savedFilePath, fileDetails2.filename);
      expect(rm).toHaveBeenCalledWith(path1);
      expect(rm).toHaveBeenCalledWith(path2);
    });
  });

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
