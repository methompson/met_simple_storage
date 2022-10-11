import { InvalidInputError } from '@/src/errors/invalid_input_error';
import {
  UploadedFile,
  NewFileDetails,
  FileDetails,
} from '@/src/models/file_models';

const originalFilename = 'originalFilename';
const filename = '5d0b2e97-870e-4184-8f10-08d5d7dd1e2b.ext';
const dateAdded = '2022-06-26T11:42:56.673Z';

describe('file_models', () => {
  let validNewFileDetails: Record<string, unknown> = {};

  const authorId = '023ueiowjfaknldsm';
  const id = '04oiejwakdscm,';
  const isPrivate = false;
  const size = 1024;

  beforeEach(() => {
    validNewFileDetails = {
      id,
      originalFilename,
      filename,
      dateAdded,
      authorId,
      size,
      isPrivate,
    };
  });

  describe('UploadedFile', () => {
    describe('nameComponents', () => {
      test('returns the extension of a file name', () => {
        expect(
          new UploadedFile('', 'test.ext', 0).nameComponents,
        ).toStrictEqual({
          name: 'test',
          extension: 'ext',
        });
        expect(
          new UploadedFile('', 'file.jpg', 0).nameComponents,
        ).toStrictEqual({
          name: 'file',
          extension: 'jpg',
        });
        expect(new UploadedFile('', 'img.png', 0).nameComponents).toStrictEqual(
          {
            name: 'img',
            extension: 'png',
          },
        );
        expect(
          new UploadedFile('', 'its a file.bmp', 0).nameComponents,
        ).toStrictEqual({
          name: 'its a file',
          extension: 'bmp',
        });
        expect(
          new UploadedFile('', 'something.gif', 0).nameComponents,
        ).toStrictEqual({
          name: 'something',
          extension: 'gif',
        });
        expect(
          new UploadedFile('', 'hello.tiff', 0).nameComponents,
        ).toStrictEqual({
          name: 'hello',
          extension: 'tiff',
        });
        expect(
          new UploadedFile('', 'abcdefg.heic', 0).nameComponents,
        ).toStrictEqual({
          name: 'abcdefg',
          extension: 'heic',
        });
      });

      test('returns a file name with periods in it intact', () => {
        expect(
          new UploadedFile('', 'test.file.name.ext', 0).nameComponents,
        ).toStrictEqual({
          name: 'test.file.name',
          extension: 'ext',
        });
      });

      test('returns an empty string for extension if none exists', () => {
        expect(
          new UploadedFile('', 'test_file_name', 0).nameComponents,
        ).toStrictEqual({
          name: 'test_file_name',
          extension: '',
        });
      });
    });

    describe('sanitizedFilename', () => {
      test('replaces nothing if none of the characters are outside the regex', () => {
        const filename = 'filename013.ext';
        const uf = new UploadedFile('', filename, 0);
        expect(uf.sanitizedFilename).toBe(filename);
      });

      test('replaces invalid characters with underscores', () => {
        const filename = 'filename$name.ext';
        const uf = new UploadedFile('', filename, 0);
        expect(uf.sanitizedFilename).toBe('filename_name.ext');
      });

      test('replaces multiple invalid characters with a single underscores', () => {
        const filename = 'filename$$$$$$name.ext';
        const uf = new UploadedFile('', filename, 0);
        expect(uf.sanitizedFilename).toBe('filename_name.ext');
      });
    });

    describe('sanitizeFilename', () => {
      test('replaces nothing if none of the characters are outside the regex', () => {
        const filename = 'filename013.ext';
        expect(UploadedFile.sanitizeFilename(filename)).toBe(filename);
      });

      test('replaces invalid characters with underscores', () => {
        const filename = 'filename$name.ext';
        expect(UploadedFile.sanitizeFilename(filename)).toBe(
          'filename_name.ext',
        );
      });

      test('replaces multiple invalid characters with a single underscores', () => {
        const filename = 'filename$$$$$$name.ext';
        expect(UploadedFile.sanitizeFilename(filename)).toBe(
          'filename_name.ext',
        );
      });
    });
  });

  describe('NewFileDetails', () => {
    describe('toJSON', () => {
      test('returns an object of specific structure', () => {
        const details = NewFileDetails.fromJSON(validNewFileDetails);

        expect(details.toJSON()).toStrictEqual({
          originalFilename,
          filename,
          dateAdded,
          authorId,
          size,
          isPrivate,
        });
      });
    });

    describe('fromJSON', () => {
      test('returns a NewFileDetails object with inputs', () => {
        const details = NewFileDetails.fromJSON(validNewFileDetails);

        expect(details.originalFilename).toBe(originalFilename);
        expect(details.dateAdded.toISOString()).toBe(dateAdded);
      });

      test('Throws an error if the inputs are invalid', () => {
        let input = { ...validNewFileDetails };

        expect(() => NewFileDetails.fromJSON(input)).not.toThrow();

        input = { ...validNewFileDetails };
        delete input.authorId;
        expect(() => NewFileDetails.fromJSON(input)).toThrow();

        input = { ...validNewFileDetails };
        input.authorId = 0;
        expect(() => NewFileDetails.fromJSON(input)).toThrow();

        input = { ...validNewFileDetails };
        delete input.originalFilename;
        expect(() => NewFileDetails.fromJSON(input)).toThrow();

        input = { ...validNewFileDetails };
        input.originalFilename = 0;
        expect(() => NewFileDetails.fromJSON(input)).toThrow();

        input = { ...validNewFileDetails };
        delete input.dateAdded;
        expect(() => NewFileDetails.fromJSON(input)).toThrow();

        input = { ...validNewFileDetails };
        input.dateAdded = 0;
        expect(() => NewFileDetails.fromJSON(input)).toThrow();

        input = { ...validNewFileDetails };
        delete input.size;
        expect(() => NewFileDetails.fromJSON(input)).toThrow();

        input = { ...validNewFileDetails };
        input.size = '0';
        expect(() => NewFileDetails.fromJSON(input)).toThrow();

        input = { ...validNewFileDetails };
        delete input.isPrivate;
        expect(() => NewFileDetails.fromJSON(input)).toThrow();

        input = { ...validNewFileDetails };
        input.isPrivate = 0;
        expect(() => NewFileDetails.fromJSON(input)).toThrow();
      });
    });

    describe('isNewFileDetailsJSON', () => {
      test('returns true if valid NewFileDetailsInterface is passed as an argument', () => {
        expect(NewFileDetails.isNewFileDetailsJSON(validNewFileDetails)).toBe(
          true,
        );
      });

      test('returns true if valid NewFileDetailsInterface is passed with extras as an argument', () => {
        const input = {
          ...validNewFileDetails,
          test: 'test',
        };

        expect(NewFileDetails.isNewFileDetailsJSON(input)).toBe(true);
      });

      test('returns false if the input is invalid', () => {
        let input = { ...validNewFileDetails };
        expect(NewFileDetails.isNewFileDetailsJSON(input)).toBe(true);

        input = { ...validNewFileDetails };
        delete input.originalFilename;
        expect(NewFileDetails.isNewFileDetailsJSON(input)).toBe(false);

        input = { ...validNewFileDetails };
        delete input.dateAdded;
        expect(NewFileDetails.isNewFileDetailsJSON(input)).toBe(false);

        input = { ...validNewFileDetails };
        delete input.authorId;
        expect(NewFileDetails.isNewFileDetailsJSON(input)).toBe(false);

        input = { ...validNewFileDetails };
        delete input.size;
        expect(NewFileDetails.isNewFileDetailsJSON(input)).toBe(false);

        input = { ...validNewFileDetails };
        delete input.isPrivate;
        expect(NewFileDetails.isNewFileDetailsJSON(input)).toBe(false);

        expect(NewFileDetails.isNewFileDetailsJSON(1)).toBe(false);
        expect(NewFileDetails.isNewFileDetailsJSON('1')).toBe(false);
        expect(NewFileDetails.isNewFileDetailsJSON(true)).toBe(false);
        expect(NewFileDetails.isNewFileDetailsJSON([])).toBe(false);
        expect(NewFileDetails.isNewFileDetailsJSON({})).toBe(false);
        expect(NewFileDetails.isNewFileDetailsJSON(null)).toBe(false);
      });
    });
  });

  describe('FileDetails', () => {
    let validFileDetails: Record<string, unknown> = {};

    beforeEach(() => {
      validFileDetails = {
        ...validNewFileDetails,
        id,
      };
    });

    describe('toJSON', () => {
      test('returns an object of specific strucutre', () => {
        const details = FileDetails.fromJSON(validFileDetails);

        expect(details.toJSON()).toStrictEqual({
          id,
          originalFilename,
          filename,
          dateAdded,
          authorId,
          size,
          isPrivate,
        });
      });
    });

    describe('fromNewFileDetails', () => {
      test('returns a FileDetails object when passed valid inputs', () => {
        const input = NewFileDetails.fromJSON(validNewFileDetails);
        const details = FileDetails.fromNewFileDetails(id, input);

        expect(details.toJSON()).toStrictEqual({
          ...validNewFileDetails,
          id,
        });
      });
    });

    describe('fromJSON', () => {
      test('Returns an FileDetails object when the input is valid', () => {
        const details = FileDetails.fromJSON(validFileDetails);

        expect(details.id).toBe(validFileDetails.id);
        expect(details.originalFilename).toBe(
          validFileDetails.originalFilename,
        );
        expect(details.dateAdded.toISOString()).toBe(
          validFileDetails.dateAdded,
        );
      });

      test('Returns an FileDetails object when the input is valid, including extras', () => {
        const input = {
          ...validFileDetails,
          test: 'tests',
        };
        const details = FileDetails.fromJSON(input);

        expect(details.id).toBe(validFileDetails.id);
        expect(details.originalFilename).toBe(
          validFileDetails.originalFilename,
        );
        expect(details.dateAdded.toISOString()).toBe(
          validFileDetails.dateAdded,
        );
      });

      test('Throws an error when the id input is invalid', () => {
        let input = { ...validFileDetails };
        expect(() => FileDetails.fromJSON(input)).not.toThrow();

        input = { ...validFileDetails };
        delete input.id;
        expect(() => FileDetails.fromJSON(input)).toThrow(
          new InvalidInputError('Invalid File Details Input'),
        );

        input = { ...validFileDetails };
        input.id = 0;
        expect(() => FileDetails.fromJSON(input)).toThrow(
          new InvalidInputError('Invalid File Details Input'),
        );

        input = { ...validFileDetails };
        input.id = null;
        expect(() => FileDetails.fromJSON(input)).toThrow(
          new InvalidInputError('Invalid File Details Input'),
        );

        input = { ...validFileDetails };
        input.id = [];
        expect(() => FileDetails.fromJSON(input)).toThrow(
          new InvalidInputError('Invalid File Details Input'),
        );
      });

      test('Throws an error when the isPrivate input is invalid', () => {
        let input = { ...validFileDetails };
        expect(() => FileDetails.fromJSON(input)).not.toThrow();

        input = { ...validFileDetails };
        delete input.id;
        expect(() => FileDetails.fromJSON(input)).toThrow(
          new InvalidInputError('Invalid File Details Input'),
        );

        input = { ...validFileDetails };
        input.isPrivate = 0;
        expect(() => FileDetails.fromJSON(input)).toThrow(
          new InvalidInputError('Invalid File Details Input'),
        );

        input = { ...validFileDetails };
        input.isPrivate = null;
        expect(() => FileDetails.fromJSON(input)).toThrow(
          new InvalidInputError('Invalid File Details Input'),
        );

        input = { ...validFileDetails };
        input.isPrivate = {};
        expect(() => FileDetails.fromJSON(input)).toThrow(
          new InvalidInputError('Invalid File Details Input'),
        );

        input = { ...validFileDetails };
        input.isPrivate = 'test';
        expect(() => FileDetails.fromJSON(input)).toThrow(
          new InvalidInputError('Invalid File Details Input'),
        );
      });

      test('Throws an error when the originalFilename input is invalid', () => {
        let input = { ...validFileDetails };
        expect(() => FileDetails.fromJSON(input)).not.toThrow();

        input = { ...validFileDetails };
        delete input.originalFilename;
        expect(() => FileDetails.fromJSON(input)).toThrow(
          new InvalidInputError('Invalid File Details Input'),
        );

        input = { ...validFileDetails };
        input.originalFilename = 0;
        expect(() => FileDetails.fromJSON(input)).toThrow(
          new InvalidInputError('Invalid File Details Input'),
        );

        input = { ...validFileDetails };
        input.originalFilename = null;
        expect(() => FileDetails.fromJSON(input)).toThrow(
          new InvalidInputError('Invalid File Details Input'),
        );

        input = { ...validFileDetails };
        input.originalFilename = [];
        expect(() => FileDetails.fromJSON(input)).toThrow(
          new InvalidInputError('Invalid File Details Input'),
        );
      });

      test('Throws an error when the size input is invalid', () => {
        let input = { ...validFileDetails };
        expect(() => FileDetails.fromJSON(input)).not.toThrow();

        input = { ...validFileDetails };
        delete input.size;
        expect(() => FileDetails.fromJSON(input)).toThrow(
          new InvalidInputError('Invalid File Details Input'),
        );

        input = { ...validFileDetails };
        input.size = false;
        expect(() => FileDetails.fromJSON(input)).toThrow(
          new InvalidInputError('Invalid File Details Input'),
        );

        input = { ...validFileDetails };
        input.size = null;
        expect(() => FileDetails.fromJSON(input)).toThrow(
          new InvalidInputError('Invalid File Details Input'),
        );

        input = { ...validFileDetails };
        input.size = [];
        expect(() => FileDetails.fromJSON(input)).toThrow(
          new InvalidInputError('Invalid File Details Input'),
        );
      });

      test('Throws an error when the dateAdded input is invalid', () => {
        let input = { ...validFileDetails };
        expect(() => FileDetails.fromJSON(input)).not.toThrow();

        input = { ...validFileDetails };
        delete input.dateAdded;
        expect(() => FileDetails.fromJSON(input)).toThrow(
          new InvalidInputError('Invalid File Details Input'),
        );

        input = { ...validFileDetails };
        input.dateAdded = 0;
        expect(() => FileDetails.fromJSON(input)).toThrow(
          new InvalidInputError('Invalid File Details Input'),
        );

        input = { ...validFileDetails };
        input.dateAdded = null;
        expect(() => FileDetails.fromJSON(input)).toThrow(
          new InvalidInputError('Invalid File Details Input'),
        );

        input = { ...validFileDetails };
        input.dateAdded = [];
        expect(() => FileDetails.fromJSON(input)).toThrow(
          new InvalidInputError('Invalid File Details Input'),
        );
      });
    });

    describe('isFileDetailsJSON', () => {
      test('Returns true if a valid FileDetailsInterface is passed as an argument', () => {
        expect(FileDetails.isFileDetailsJSON(validFileDetails)).toBe(true);

        const moreDetails = { ...validFileDetails };
        moreDetails.files = [];

        expect(FileDetails.isFileDetailsJSON(moreDetails)).toBe(true);
      });

      test('Returns true if a valid FileDetailsInterface with extra data is passed as an argument', () => {
        const fileDetails = {
          ...validFileDetails,
          test: 'test',
        };

        expect(FileDetails.isFileDetailsJSON(fileDetails)).toBe(true);
      });

      test('Returns false if the input is invalid', () => {
        let fileDetails = { ...validFileDetails };
        expect(FileDetails.isFileDetailsJSON(fileDetails)).toBe(true);

        fileDetails = { ...validFileDetails };
        delete fileDetails.id;
        expect(FileDetails.isFileDetailsJSON(fileDetails)).toBe(false);

        fileDetails = { ...validFileDetails };
        delete fileDetails.size;
        expect(FileDetails.isFileDetailsJSON(fileDetails)).toBe(false);

        fileDetails = { ...validFileDetails };
        delete fileDetails.isPrivate;
        expect(FileDetails.isFileDetailsJSON(fileDetails)).toBe(false);

        fileDetails = { ...validFileDetails };
        delete fileDetails.originalFilename;
        expect(FileDetails.isFileDetailsJSON(fileDetails)).toBe(false);

        fileDetails = { ...validFileDetails };
        delete fileDetails.dateAdded;
        expect(FileDetails.isFileDetailsJSON(fileDetails)).toBe(false);

        expect(FileDetails.isFileDetailsJSON(1)).toBe(false);
        expect(FileDetails.isFileDetailsJSON('1')).toBe(false);
        expect(FileDetails.isFileDetailsJSON(true)).toBe(false);
        expect(FileDetails.isFileDetailsJSON([])).toBe(false);
        expect(FileDetails.isFileDetailsJSON({})).toBe(false);
        expect(FileDetails.isFileDetailsJSON(null)).toBe(false);
      });
    });
  });
});
