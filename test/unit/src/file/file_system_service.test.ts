import * as path from 'path';

import { FileSystemService } from '@/src/file/file_system_service';

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

describe('FileService', () => {
  const testError = 'testError aosihdjflnkasd';
  const savedFilePath = 'savedFilePath';

  describe('deleteFiles', () => {
    test('Returns results related to file operations', async () => {
      const fss = new FileSystemService();
      const delSpy = jest.spyOn(fss, 'deleteFile');
      delSpy.mockImplementation(async () => {});

      const result = await fss.deleteFiles(savedFilePath, ['a', 'b']);
      expect(Object.keys(result).length).toBe(2);

      expect(result.a?.filename).toBe('a');
      expect(result.a?.error).toBe(undefined);

      expect(result.b?.filename).toBe('b');
      expect(result.b?.error).toBe(undefined);

      const pathA = path.join(savedFilePath, 'a');
      const pathB = path.join(savedFilePath, 'b');

      expect(delSpy).toHaveBeenCalledTimes(2);
      expect(delSpy).toHaveBeenCalledWith(pathA);
      expect(delSpy).toHaveBeenCalledWith(pathB);
    });

    test('Returns error results related to file operations', async () => {
      const errPath = path.join(savedFilePath, 'a');

      const fss = new FileSystemService();
      const delSpy = jest.spyOn(fss, 'deleteFile');
      delSpy.mockImplementation(async (filePath) => {
        if (filePath == errPath) {
          throw new Error(testError);
        }
      });

      const result = await fss.deleteFiles(savedFilePath, ['a', 'b']);
      expect(Object.keys(result).length).toBe(2);

      expect(result.a?.filename).toBe('a');
      expect(result.a?.error?.toString()).toContain(testError);
      expect(result.b?.filename).toBe('b');
      expect(result.b?.error).toBe(undefined);

      const pathA = path.join(savedFilePath, 'a');
      const pathB = path.join(savedFilePath, 'b');

      expect(delSpy).toHaveBeenCalledTimes(2);
      expect(delSpy).toHaveBeenCalledWith(pathA);
      expect(delSpy).toHaveBeenCalledWith(pathB);
    });

    test('Returns an empty object if an empty array is passed in', async () => {
      const fss = new FileSystemService();
      const delSpy = jest.spyOn(fss, 'deleteFile');

      const result = await fss.deleteFiles(savedFilePath, []);
      expect(Object.keys(result).length).toBe(0);

      expect(delSpy).toHaveBeenCalledTimes(0);
    });
  });
});
