./docker/scripts/docker_build_x86.sh

mkdir -p ./docker/artifacts/bin

(
  cd docker
  docker save met_simple_storage -o ./artifacts/bin/met_simple_storage.tar
)
