#!/bin/bash

current_path=$(dirname $0)
## Configure the PORT ulixee will run on
port="${PORT:=8080}"
## Enable verbose logs
DEBUG=ubk*,ulx*
## NOTE: these are unix oriented. adjust as needed for Windows
DATABOXES_MOUNT=$HOME/.cache/ulixee/databoxes
DATADIR_MOUNT=/tmp/.ulixee

## example of running core server
# Other useful settings
# - Add a file of configurations: --env-file ./.env
# - Mount a folder containing databoxes
docker run -it --init \
    --ipc=host \
    --user ulixee \
    --restart unless-stopped \
    --sysctl net.ipv4.tcp_keepalive_intvl=10 \
    --sysctl net.ipv4.tcp_keepalive_probes=3 \
    --log-opt max-size=50m --log-opt max-file=3 \
    --log-driver local \
    --security-opt seccomp="$current_path/seccomp_profile.json" \
    -v $DATABOXES_MOUNT:/home/ulixee/.cache/ulixee/databoxes \
    -v $DATADIR_MOUNT:/tmp/.ulixee \
    -p "$port:$port" \
    -e DEBUG=$DEBUG \
    ulixee \
    xvfb-run npx @ulixee/server start --port=${port}
