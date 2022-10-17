import { isRecord, isString, isNumber } from '@/src/utils/type_guards';

interface MongoDBOptions {
  username: string;
  password: string;
  url: string;
  port: string | number;
}

function isMongoDBOptions(value: unknown): value is MongoDBOptions {
  if (!isRecord(value)) {
    return false;
  }

  const usernameTest = isString(value.username);
  const passwordTest = isString(value.password);
  const urlTest = isString(value.url);
  const portTest = !(
    isString(value.port) ||
    isNumber(value.port) ||
    value.port === undefined
  );

  return usernameTest && passwordTest && urlTest && portTest;
}

export { MongoDBOptions, isMongoDBOptions };
