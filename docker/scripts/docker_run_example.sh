(
  cd docker && \
  docker run \
  --rm \
  -p 8000:80 \
  -e PORT='80' \
  -e MONGO_DB_URI='uri' \
  -e MONGO_DB_NAME='files' \
  -e CONSOLE_LOGGING='true' \
  -e DB_LOGGING='true' \
  -e FILE_LOGGING='false' \
  -e FILE_SERVER_TYPE='mongo_db' \
  -e SAVED_FILE_PATH='/srv/files' \
  -e GOOGLE_APPLICATION_CREDENTIALS='/srv/fire_server/firebase.json' \
  -v /path/to/local/files:/srv/file_server/files \
  --name met_simple_storage \
  met_simple_storage
)