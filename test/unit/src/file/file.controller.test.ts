import * as path from 'path';

import { Formidable } from 'formidable';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';
import { sign } from 'jsonwebtoken';

import { FileController } from '@/src/file/file.controller';
import { InMemoryFileDataService } from '@/src/file/file_data.memory.service';
import { FileSystemService } from '@/src/file/file_system_service';
import { AuthModel } from '@/src/models/auth_model';
import { FileDetails } from '@/src/models/file_models';
import { LoggerService } from '@/src/logger/logger.service';

jest.mock('@/src/file/file_system_service', () => {
  function FileSystemService() {}
  FileSystemService.prototype.getNewFileName = jest.fn();
  FileSystemService.prototype.pathExists = jest.fn(async () => {});
  FileSystemService.prototype.makeDirectory = jest.fn(async () => {});
  FileSystemService.prototype.moveFile = jest.fn(async () => {});
  FileSystemService.prototype.deleteFile = jest.fn(async () => {});
  FileSystemService.prototype.deleteFiles = jest.fn(async () => {});
  FileSystemService.prototype.rollBackWrites = jest.fn(async () => {});

  return {
    FileSystemService,
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

const getNewFileName = FileSystemService.prototype.getNewFileName as jest.Mock;
const pathExists = FileSystemService.prototype.pathExists as jest.Mock;
const makeDirectory = FileSystemService.prototype.makeDirectory as jest.Mock;
const moveFile = FileSystemService.prototype.moveFile as jest.Mock;
const deleteFile = FileSystemService.prototype.deleteFile as jest.Mock;
const deleteFiles = FileSystemService.prototype.deleteFiles as jest.Mock;
const rollBackWrites = FileSystemService.prototype.rollBackWrites as jest.Mock;

const errorSpy = jest.spyOn(console, 'error');
errorSpy.mockImplementation(() => {});

const parse = Formidable.prototype.parse as jest.Mock<unknown, unknown[]>;

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

    getNewFileName.mockReset();
    pathExists.mockReset();
    makeDirectory.mockReset();
    moveFile.mockReset();
    deleteFile.mockReset();
    deleteFiles.mockReset();
    rollBackWrites.mockReset();
  });

  describe('getFileByName', () => {
    test('Returns a file if the file exists, it is public and the user has no authentication', async () => {
      const fds = new InMemoryFileDataService([fileDetails1, fileDetails2]);
      const fc = new FileController(
        new ConfigService(),
        fds,
        new LoggerService([]),
      );

      pathExists.mockImplementationOnce(async () => {});

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

      expect(pathExists).toHaveBeenCalledTimes(1);
      expect(pathExists).toHaveBeenCalledWith(filePath);

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

      pathExists.mockImplementationOnce(async () => {});

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

      expect(pathExists).toHaveBeenCalledTimes(1);
      expect(pathExists).toHaveBeenCalledWith(filePath);

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

      pathExists.mockImplementationOnce(async () => {});

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

      expect(pathExists).toHaveBeenCalledTimes(1);
      expect(pathExists).toHaveBeenCalledWith(filePath);

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

      pathExists.mockImplementationOnce(async () => {});

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

      expect(pathExists).toHaveBeenCalledTimes(1);
      expect(pathExists).toHaveBeenCalledWith(filePath);

      expect(sendFile).toHaveBeenCalledTimes(0);
    });

    test('Throws an error, if the file exists, but has no DB entry, and the user is not authenticated', async () => {
      const fds = new InMemoryFileDataService([fileDetails1, fileDetails2]);
      const fc = new FileController(
        new ConfigService(),
        fds,
        new LoggerService([]),
      );

      pathExists.mockImplementationOnce(async () => {});

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

      expect(pathExists).toHaveBeenCalledTimes(1);
      expect(pathExists).toHaveBeenCalledWith(filePath);

      expect(sendFile).toHaveBeenCalledTimes(0);
    });

    test('Throws an error, if the file exists, but has no DB entry, and the user is authenticated', async () => {
      const fds = new InMemoryFileDataService([fileDetails1, fileDetails2]);
      const fc = new FileController(
        new ConfigService(),
        fds,
        new LoggerService([]),
      );

      pathExists.mockImplementationOnce(async () => {});

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

      expect(pathExists).toHaveBeenCalledTimes(1);
      expect(pathExists).toHaveBeenCalledWith(filePath);

      expect(sendFile).toHaveBeenCalledTimes(0);
    });

    test('Throws an error, if the file has a DB entry, but does not exist, and the user is not authenticated', async () => {
      const fds = new InMemoryFileDataService([fileDetails1, fileDetails2]);
      const fc = new FileController(
        new ConfigService(),
        fds,
        new LoggerService([]),
      );

      pathExists.mockImplementationOnce(async () => {
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

      expect(pathExists).toHaveBeenCalledTimes(1);
      expect(pathExists).toHaveBeenCalledWith(filePath);

      expect(sendFile).toHaveBeenCalledTimes(0);
    });

    test('Throws an error, if the file has a DB entry, but does not exist, and the user is authenticated', async () => {
      const fds = new InMemoryFileDataService([fileDetails1, fileDetails2]);
      const fc = new FileController(
        new ConfigService(),
        fds,
        new LoggerService([]),
      );

      pathExists.mockImplementationOnce(async () => {
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

      expect(pathExists).toHaveBeenCalledTimes(1);
      expect(pathExists).toHaveBeenCalledWith(filePath);

      expect(sendFile).toHaveBeenCalledTimes(0);
    });
  });
});
