import { isRecord, isString, isNumber } from '@/src/utils/type_guards';

interface MongoDBOptions {
  username: string;
  password: string;
  url: string;
  port: string | number;
}

function isMongoDBOptions(value: unknown): value is MongoDBOptions {
  if (
    !isRecord(value) ||
    !isString(value.username) ||
    !isString(value.password) ||
    !isString(value.url) ||
    !(isString(value.port) || isNumber(value.port) || value.port === undefined)
  ) {
    return false;
  }

  return true;
}

export { MongoDBOptions, isMongoDBOptions };
