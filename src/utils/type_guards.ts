function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    !isNullOrUndefined(value) &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isDate(value: unknown): value is Date {
  return value instanceof Date;
}

function isNull(value: unknown): value is null {
  return value === null;
}

function isUndefined(value: unknown): value is undefined {
  return value === undefined;
}

function isNullOrUndefined(value: unknown): value is null | undefined {
  return isNull(value) || isUndefined(value);
}

function isStringArray(value: unknown): value is string[] {
  if (Array.isArray(value)) {
    for (const t of value) {
      if (!isString(t)) {
        return false;
      }
    }
  } else {
    // If not an array, just return false
    return false;
  }

  return true;
}

export {
  isRecord,
  isString,
  isNumber,
  isBoolean,
  isDate,
  isStringArray,
  isNull,
  isUndefined,
  isNullOrUndefined,
};
