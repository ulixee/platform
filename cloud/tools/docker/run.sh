#!/bin/bash

current_path=$(dirname $0)
cd $current_path

## Download a secure profile if needed that supports Chrome Sandboxes
SECURE_PROFILE=./seccomp_profile.json
if [ ! -f "$SECURE_PROFILE" ]; then
  curl -L https://raw.githubusercontent.com/docker/engine/master/profiles/seccomp/default.json -o "$SECURE_PROFILE"

  tmp=$(mktemp)
  # seccomp.json is needed to support Chrome sandbox user namespace permissions
  jq '.syscalls = [{"comment":"Allow create user namespaces","names":["clone","setns","unshare"],"action":"SCMP_ACT_ALLOW","args":[],"includes":{},"excludes":{}}] + .syscalls' "$SECURE_PROFILE" > "$tmp"
  mv "$tmp" "$SECURE_PROFILE"

  sudo apt-get -y install runc
fi

## Configure the PORT ulixee will run on
port="${PORT:=1818}"
## Enable verbose logs
DEBUG=ubk*,ulx*
## NOTE: these are unix oriented. adjust as needed for Windows
DATASTORES_MOUNT=$HOME/.cache/ulixee/datastores
DATADIR_MOUNT=/tmp/.ulixee

chmod 777 $DATADIR_MOUNT
chmod 777 $DATASTORES_MOUNT

# To add an environment configuration file:
# `--env-file ./.env`
# All environment configurations can be found at: `cloud/main/.env.defaults`
docker run -it --init \
    --ipc=host \
    --user ulixee \
    --restart unless-stopped \
    --sysctl net.ipv4.tcp_keepalive_intvl=10 \
    --sysctl net.ipv4.tcp_keepalive_probes=3 \
    --log-opt max-size=50m --log-opt max-file=3 \
    --log-driver local \
    --security-opt seccomp="$SECURE_PROFILE" \
    -v $DATASTORES_MOUNT:/home/ulixee/.cache/ulixee/datastores \
    -v $DATADIR_MOUNT:/tmp/.ulixee \
    -p "$port:$port" \
    -e DEBUG=$DEBUG \
    -e DISPLAY=:99 \
    ulixee-cloud \
    xvfb-run npx @ulixee/cloud start --port=${port}
