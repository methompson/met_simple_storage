import { isDate } from '@/src/utils/type_guards';

type ValidDate = Date;

function isValidDate(value: unknown): value is ValidDate {
  return isDate(value) && !Number.isNaN(value.getTime());
}

export { ValidDate, isValidDate };
