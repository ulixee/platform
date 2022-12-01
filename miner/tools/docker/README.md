# This README describes how to install and run the Ulixee docker image.

If you're using something like Amazon ECS, you can extrapolate the parts that apply to you.

## Install Docker on Ubuntu

This script will install docker and register a service to run on bootup.
```bash
sudo apt update
sudo apt install docker.io
# start a daemon to auto-run service
sudo systemctl start docker.service
sudo systemctl enable docker.service
# allow non-root access
sudo usermod -aG docker $USER
reboot
```

## Pull Docker image from Github Container Registry
```bash
docker pull ghcr.io/ulixee/ulixee-miner:latest
docker tag ghcr.io/ulixee/ulixee-miner:latest ulixee-miner
```

## Pull Docker image from Dockerhub
```bash
docker pull ulixee/ulixee-miner:latest
docker tag ulixee/ulixee-miner ulixee-miner
```

# Copy/modify run.sh On Your Server
The [run.sh](./run.sh) file can be a starting point to run the docker on your server. It configures docker as follows:
* `--init` Register a process cleanup service.
* `-p 8080:8080` By default, register 8080 as the internal and published port.
* `--ipc=host` Chrome can run out of memory if you don't use the system host for it's IPC communications.
* `--user ulixee` We build the docker to run as a non-root user.
* `--restart unless-stopped` Reboot the process on crash unless you explicitly call docker stop.
* `--log-opt max-size=50m --log-opt max-file=3 --log-driver local` Add rotating log files.
* `--security-opt seccomp="$SECURE_PROFILE"` Clones the default Docker seccomp profile to run reduced linux permissions. It adds user namespace permissions to enable Chrome Sandboxing without root user. NOTE: You MUST use the seccomp settings or turn off Chrome sandboxes.
* `-v $DATABOXES_MOUNT:/home/ulixee/.cache/ulixee/databoxes` Mount and chmod 777 a directory on the host OS where Databoxes can be packaged for deployment.
* `-v $DATADIR_MOUNT:/tmp/.ulixee` Mount a tmp directory and chmod 777 so that the `ulixee` user can store Session databases in this directory.
* `-e DISPLAY=:99`, `xvfb-run` Allows headed Chrome with a virtual display.
* `-e DEBUG=ubk*,ulx*` Configures Ulixee to emit very verbose logs to the console. Removing ubk* will remove devtools logging.
