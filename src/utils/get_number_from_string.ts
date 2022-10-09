export function getIntFromString(input: string, defaultValue = 0) {
  const parsedInt = Number.parseInt(input, 10);
  if (Number.isNaN(parsedInt)) {
    return defaultValue;
  }
  return parsedInt;
}
