import path from 'path';

export function fileConfiguration() {
  let fileServerType = 'memory';
  if (process.env.FILE_SERVER_TYPE === 'mongo_db') {
    fileServerType = 'mongo_db';
  }

  return {
    fileServerType,
    temp_file_path: process.env.TEMP_FILE_PATH ?? '',
    saved_file_path:
      process.env.SAVED_FILE_PATH ?? path.join(__dirname, 'file'),
  };
}
