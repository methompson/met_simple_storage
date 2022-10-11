import formidable from 'formidable';
import {
  isBoolean,
  isNumber,
  isRecord,
  isString,
} from '@/src/utils/type_guards';
import { InvalidInputError } from '@/src/errors';

interface FilenameComponents {
  name: string;
  extension: string;
}

export class UploadedFile {
  constructor(
    protected _filepath: string,
    protected _originalFilename: string,
    protected _size: number,
  ) {}

  get filepath() {
    return this._filepath;
  }
  get originalFilename() {
    return this._originalFilename;
  }
  get size() {
    return this._size;
  }

  get nameComponents(): FilenameComponents {
    const split = this.originalFilename.split('.');
    if (split.length === 1) {
      return {
        name: this.originalFilename,
        extension: '',
      };
    }

    const splitPoint = split.length - 1;

    return {
      name: split.slice(0, splitPoint).join('.'),
      extension: split[splitPoint],
    };
  }

  get sanitizedFilename(): string {
    return UploadedFile.sanitizeFilename(this.originalFilename);
  }

  static fromFormidable(file: formidable.File): UploadedFile {
    return new UploadedFile(file.filepath, file.originalFilename, file.size);
  }

  static sanitizeFilename(filename: string): string {
    const sanitizedName = filename.replace(/[^A-Za-z0-9._-]+/g, '_');

    return sanitizedName.replace(/[_]+/g, '_');
  }
}

export interface NewFileDetailsJSON {
  originalFilename: string;
  filename: string;
  dateAdded: string;
  authorId: string;
  size: number;
  isPrivate: boolean;
}

export class NewFileDetails {
  constructor(
    protected _originalFilename: string,
    protected _filename: string,
    protected _dateAdded: Date,
    protected _authorId: string,
    protected _size: number,
    protected _isPrivate: boolean,
  ) {}

  get originalFilename(): string {
    return this._originalFilename;
  }
  get filename(): string {
    return this._filename;
  }
  get dateAdded(): Date {
    return this._dateAdded;
  }
  get authorId(): string {
    return this._authorId;
  }
  get size(): number {
    return this._size;
  }
  get isPrivate(): boolean {
    return this._isPrivate;
  }

  toJSON(): NewFileDetailsJSON {
    return {
      originalFilename: this.originalFilename,
      filename: this.filename,
      dateAdded: this.dateAdded.toISOString(),
      authorId: this.authorId,
      size: this.size,
      isPrivate: this.isPrivate,
    };
  }

  static fromJSON(input: unknown): NewFileDetails {
    if (!NewFileDetails.isNewFileDetailsJSON(input)) {
      throw new InvalidInputError('Invalid File Details');
    }

    const dateAdded = new Date(input.dateAdded);

    return new NewFileDetails(
      input.originalFilename,
      input.filename,
      dateAdded,
      input.authorId,
      input.size,
      input.isPrivate,
    );
  }

  static isNewFileDetailsJSON(input: unknown): input is NewFileDetailsJSON {
    if (!isRecord(input)) {
      return false;
    }

    const originalFilenameTest = isString(input.originalFilename);
    const filenameTest = isString(input.filename);
    const dateAddedTest = isString(input.dateAdded);
    const authorIdTest = isString(input.authorId);
    const sizeTest = isNumber(input.size);
    const isPrivateTest = isBoolean(input.isPrivate);

    return (
      originalFilenameTest &&
      filenameTest &&
      dateAddedTest &&
      authorIdTest &&
      sizeTest &&
      isPrivateTest
    );
  }
}

export interface FileDetailsJSON extends NewFileDetailsJSON {
  id: string;
}

export class FileDetails extends NewFileDetails {
  constructor(
    protected _id: string,
    originalFilename: string,
    filename: string,
    dateAdded: Date,
    authorId: string,
    size: number,
    isPrivate: boolean,
  ) {
    super(originalFilename, filename, dateAdded, authorId, size, isPrivate);
  }

  get id(): string {
    return this._id;
  }

  toJSON(): FileDetailsJSON {
    return {
      ...super.toJSON(),
      id: this.id,
    };
  }

  static fromNewFileDetails(
    id: string,
    fileDetails: NewFileDetails,
  ): FileDetails {
    return new FileDetails(
      id,
      fileDetails.originalFilename,
      fileDetails.filename,
      fileDetails.dateAdded,
      fileDetails.authorId,
      fileDetails.size,
      fileDetails.isPrivate,
    );
  }

  static fromJSON(input: unknown): FileDetails {
    if (!FileDetails.isFileDetailsJSON(input)) {
      throw new InvalidInputError('Invalid File Details Input');
    }

    const dateAdded = new Date(input.dateAdded);

    return new FileDetails(
      input.id,
      input.originalFilename,
      input.filename,
      dateAdded,
      input.authorId,
      input.size,
      input.isPrivate,
    );
  }

  static isFileDetailsJSON(input: unknown): input is FileDetailsJSON {
    if (!isRecord(input)) {
      return false;
    }

    const idTest = isString(input.id);
    const originalFilenameTest = isString(input.originalFilename);
    const filenameTest = isString(input.filename);
    const dateAddedTest = isString(input.dateAdded);
    const authorIdTest = isString(input.authorId);
    const sizeTest = isNumber(input.size);
    const isPrivateTest = isBoolean(input.isPrivate);

    return (
      idTest &&
      originalFilenameTest &&
      filenameTest &&
      dateAddedTest &&
      authorIdTest &&
      sizeTest &&
      isPrivateTest
    );
  }
}
