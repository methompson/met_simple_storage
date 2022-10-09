import { isString } from '@/src/utils/type_guards';

export function mongodbConfiguration() {
  const mongoDBUri = process.env.MONGO_DB_URI;
  const mongoDBName = process.env.MONGO_DB_NAME;

  if (isString(mongoDBUri)) {
    return {
      mongoDBUri,
      mongoDBName,
    };
  }

  return {};
}
