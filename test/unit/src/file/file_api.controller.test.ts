import formidable, { Formidable } from 'formidable';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';

import { FileAPIController } from '@/src/file/file_api.controller';
import { InMemoryFileDataService } from '@/src/file/file_data.memory.service';
import { FileSystemService } from '@/src/file/file_system_service';
import { FileDetails, UploadedFile } from '@/src/models/file_models';
import { LoggerService } from '@/src/logger/logger.service';
import { DeleteFilesJSON } from '@/src/file/file_data.service';

type FormidableParseCallback = (
  err: any,
  fields: formidable.Fields,
  files: formidable.Files,
) => void;

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

  const userId = '99c44a1a-2582-4792-9879-45b5e43b0f33';

  describe('getFileList', () => {
    test('Returns a list of files and a morePages value', async () => {
      const fileDataService = new InMemoryFileDataService();
      const fc = new FileAPIController(
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
      const fc = new FileAPIController(
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
      const fc = new FileAPIController(
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
      expect(getFilesSpy).toHaveBeenCalledWith({ page: 1, pagination: 20 });
    });

    test('passes parsed values to getFileList', async () => {
      const fileDataService = new InMemoryFileDataService();
      const fc = new FileAPIController(
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
      expect(getFilesSpy).toHaveBeenCalledWith({ page: 11, pagination: 23 });
    });

    test('passes default values to getFileList', async () => {
      const fileDataService = new InMemoryFileDataService();
      const fc = new FileAPIController(
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
      expect(getFilesSpy).toHaveBeenCalledWith({ page: 1, pagination: 20 });
    });

    test('Throws an error if getFileList throws an error', async () => {
      const fileDataService = new InMemoryFileDataService();
      const fc = new FileAPIController(
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

  describe('uploadFiles', () => {
    test('Runs parseFilesAndFields, addFiles and rename', async () => {
      const fileDataService = new InMemoryFileDataService();
      const fc = new FileAPIController(
        new ConfigService(),
        fileDataService,
        new LoggerService([]),
      );

      const req = {} as unknown as Request;

      const file = { file: file1 };
      parse.mockImplementationOnce((a, b: FormidableParseCallback) => {
        b(null, {}, file);
      });

      const parseSpy = jest.spyOn(fc, 'parseFilesAndFields');
      const addFilesSpy = jest.spyOn(fileDataService, 'addFiles');

      await fc.uploadFiles(req, userId);

      expect(addFilesSpy).toHaveBeenCalledTimes(1);
      expect(moveFile).toHaveBeenCalledTimes(1);
      expect(parseSpy).toHaveBeenCalledTimes(1);
    });

    test('Returns an array of JSON', async () => {
      const fileDataService = new InMemoryFileDataService();
      const fc = new FileAPIController(
        new ConfigService(),
        fileDataService,
        new LoggerService([]),
      );

      const req = {} as unknown as Request;

      const file = { file: file1 };
      parse.mockImplementationOnce((a, b: FormidableParseCallback) => {
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
      const fc = new FileAPIController(
        new ConfigService(),
        fileDataService,
        new LoggerService([]),
      );

      const req = {} as unknown as Request;

      const file = { file: [file1, file2] };
      parse.mockImplementationOnce((a, b: FormidableParseCallback) => {
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
      expect(moveFile).toHaveBeenCalledTimes(2);
    });

    test('throws an error if parseFilesAndFields throws an error', async () => {
      const fileDataService = new InMemoryFileDataService();
      const fc = new FileAPIController(
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
      expect(moveFile).toHaveBeenCalledTimes(0);
    });

    test('throws an error if moveFile throws an error', async () => {
      const fileDataService = new InMemoryFileDataService();
      const fc = new FileAPIController(
        new ConfigService(),
        fileDataService,
        new LoggerService([]),
      );

      const req = {} as unknown as Request;

      const file = { file: file1 };
      parse.mockImplementationOnce((a, b: FormidableParseCallback) => {
        b(null, {}, file);
      });

      const parseSpy = jest.spyOn(fc, 'parseFilesAndFields');
      const addFilesSpy = jest.spyOn(fileDataService, 'addFiles');
      const rollBackSpy = jest.spyOn(fc, 'rollBackWrites');

      moveFile.mockImplementationOnce(() => {
        throw new Error(testError);
      });

      await expect(() => fc.uploadFiles(req, userId)).rejects.toThrow();

      expect(parseSpy).toHaveBeenCalledTimes(1);
      expect(moveFile).toHaveBeenCalledTimes(1);
      expect(addFilesSpy).toHaveBeenCalledTimes(0);
      expect(rollBackSpy).toHaveBeenCalledTimes(1);
    });

    test('throws an error if addFiles throws an error', async () => {
      const fileDataService = new InMemoryFileDataService();
      const fc = new FileAPIController(
        new ConfigService(),
        fileDataService,
        new LoggerService([]),
      );

      const req = {} as unknown as Request;

      const file = { file: file1 };
      parse.mockImplementationOnce((a, b: FormidableParseCallback) => {
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
      expect(moveFile).toHaveBeenCalledTimes(1);
      expect(addFilesSpy).toHaveBeenCalledTimes(1);
      expect(rollBackSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteFiles', () => {
    test('Returns a JSON object of data about the deletion', async () => {
      const fds = new InMemoryFileDataService([fileDetails1, fileDetails2]);
      const fc = new FileAPIController(
        new ConfigService(),
        fds,
        new LoggerService([]),
      );

      deleteFiles.mockImplementationOnce(async () => {
        const output: Record<string, DeleteFilesJSON> = {};
        output[fileDetails1.filename] = { filename: fileDetails1.filename };
        output[fileDetails2.filename] = { filename: fileDetails2.filename };
        return output;
      });

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
      expect(result1.errors).toStrictEqual([]);
      expect(result1.filename).toBe(fileDetails1.filename);

      expect(result2.fileDetails).toStrictEqual(fileDetails2.toJSON());
      expect(result2.errors).toStrictEqual([]);
      expect(result2.filename).toBe(fileDetails2.filename);
    });

    test('Returns error details from fileService.delete files', async () => {
      const badFilename = 'badFilename';
      const fds = new InMemoryFileDataService([fileDetails1, fileDetails2]);
      const fc = new FileAPIController(
        new ConfigService(),
        fds,
        new LoggerService([]),
      );

      deleteFiles.mockImplementationOnce(async () => {
        const output: Record<string, DeleteFilesJSON> = {};
        output[fileDetails1.filename] = { filename: fileDetails1.filename };
        output[badFilename] = { filename: badFilename };
        return output;
      });

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
      expect(result1.errors).toStrictEqual([]);
      expect(result1.filename).toBe(fileDetails1.filename);

      expect(result2.fileDetails).toBeUndefined();
      expect(result2.errors.length).toBe(1);
      expect(result2.errors).toContain('File Does Not Exist In Database');
      expect(result2.filename).toBe(badFilename);
    });

    test('Returns error details from deleteFilesFromFileSystem', async () => {
      const fds = new InMemoryFileDataService([fileDetails1, fileDetails2]);
      const fc = new FileAPIController(
        new ConfigService(),
        fds,
        new LoggerService([]),
      );

      deleteFiles.mockImplementationOnce(async () => {
        const output: Record<string, DeleteFilesJSON> = {};
        output[fileDetails1.filename] = { filename: fileDetails1.filename };
        output[fileDetails2.filename] = {
          filename: fileDetails2.filename,
          error: testError,
        };
        return output;
      });

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

      expect(deleteFiles).toHaveBeenCalledWith(fc.savedFilePath, [
        fileDetails1.filename,
        fileDetails2.filename,
      ]);

      expect(result1.fileDetails).toStrictEqual(fileDetails1.toJSON());
      expect(result1.errors).toStrictEqual([]);
      expect(result1.filename).toBe(fileDetails1.filename);

      expect(result2.fileDetails).toStrictEqual(fileDetails2.toJSON());
      expect(result2.errors.length).toBe(1);
      expect(result2.errors[0]).toContain(testError);
      expect(result2.filename).toBe(fileDetails2.filename);
    });

    test('Runs several functions with specific inputs', async () => {
      const fds = new InMemoryFileDataService([fileDetails1, fileDetails2]);
      const fc = new FileAPIController(
        new ConfigService(),
        fds,
        new LoggerService([]),
      );

      deleteFiles.mockImplementationOnce(async () => {
        const output: Record<string, DeleteFilesJSON> = {};
        output[fileDetails1.filename] = { filename: fileDetails1.filename };
        output[fileDetails2.filename] = { filename: fileDetails2.filename };
        return output;
      });

      const body = [fileDetails1.filename, fileDetails2.filename];

      const req = { body } as unknown as Request;

      const deleteFSSpy = jest.spyOn(fds, 'deleteFiles');

      await fc.deleteFiles(req);

      expect(deleteFSSpy).toHaveBeenCalledTimes(1);
      expect(deleteFSSpy).toHaveBeenCalledWith(body);

      expect(deleteFiles).toHaveBeenCalledTimes(1);

      expect(deleteFiles).toHaveBeenCalledWith(fc.savedFilePath, [
        fileDetails1.filename,
        fileDetails2.filename,
      ]);
    });

    test('Throws an error if fileService.deleteFiles throws an error', async () => {
      const fds = new InMemoryFileDataService([fileDetails1, fileDetails2]);
      const fc = new FileAPIController(
        new ConfigService(),
        fds,
        new LoggerService([]),
      );

      deleteFiles.mockImplementationOnce(async () => {
        const output: Record<string, DeleteFilesJSON> = {};
        output[fileDetails1.filename] = { filename: fileDetails1.filename };
        output[fileDetails2.filename] = { filename: fileDetails2.filename };
        return output;
      });

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

      expect(deleteFiles).toHaveBeenCalledTimes(1);

      expect(deleteFiles).toHaveBeenCalledWith(fc.savedFilePath, [
        fileDetails1.filename,
        fileDetails2.filename,
      ]);
    });

    test('Throws an error if deleteFilesFromFileSystem throws an error', async () => {
      const fds = new InMemoryFileDataService([fileDetails1, fileDetails2]);
      const fc = new FileAPIController(
        new ConfigService(),
        fds,
        new LoggerService([]),
      );

      deleteFiles.mockImplementationOnce(async () => {
        const output: Record<string, DeleteFilesJSON> = {};
        output[fileDetails1.filename] = { filename: fileDetails1.filename };
        output[fileDetails2.filename] = { filename: fileDetails2.filename };
        return output;
      });

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

      expect(deleteFiles).toHaveBeenCalledTimes(1);

      expect(deleteFiles).toHaveBeenCalledWith(fc.savedFilePath, [
        fileDetails1.filename,
        fileDetails2.filename,
      ]);
    });
  });

  describe('parseFilesAndFields', () => {
    test('returns a file and default ops', async () => {
      const fileDataService = new InMemoryFileDataService();
      const fc = new FileAPIController(
        new ConfigService(),
        fileDataService,
        new LoggerService([]),
      );

      const req = {} as unknown as Request;

      const file = { file: file1 };
      parse.mockImplementationOnce((a, b: FormidableParseCallback) => {
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
      const fc = new FileAPIController(
        new ConfigService(),
        fileDataService,
        new LoggerService([]),
      );

      const req = {} as unknown as Request;

      const file = { file: file1 };
      const fields = {
        ops: JSON.stringify({ isPrivate: false }),
      };
      parse.mockImplementationOnce((a, b: FormidableParseCallback) => {
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
      const fc = new FileAPIController(
        new ConfigService(),
        fileDataService,
        new LoggerService([]),
      );

      const req = {} as unknown as Request;

      const file = { file: [file1, file2] };
      parse.mockImplementationOnce((a, b: FormidableParseCallback) => {
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
      const fc = new FileAPIController(
        new ConfigService(),
        fileDataService,
        new LoggerService([]),
      );

      const req = {} as unknown as Request;

      parse.mockImplementationOnce((a, b: FormidableParseCallback) => {
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
      const fc = new FileAPIController(
        new ConfigService(),
        fileDataService,
        new LoggerService([]),
      );

      const req = {} as unknown as Request;

      const malformedFile = { ...file1 };
      delete malformedFile.size;

      const file = { file: malformedFile };
      parse.mockImplementationOnce((a, b: FormidableParseCallback) => {
        b(null, {}, file);
      });

      await expect(() => fc.parseFilesAndFields(req, '')).rejects.toThrow();

      expect(parse).toHaveBeenCalledTimes(1);
      expect(parse).toHaveBeenCalledWith(req, expect.anything());
    });
  });
});
