export function logConfiguration() {
  const console_logging = process.env.CONSOLE_LOGGING === 'true';
  const db_logging = process.env.DB_LOGGING === 'true';
  const file_logging = process.env.FILE_LOGGING === 'true';

  return {
    console_logging,
    db_logging,
    file_logging,
  };
}
