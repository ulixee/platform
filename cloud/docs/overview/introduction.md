# Introduction

> Ulixee Platform is a Scraping Data Collection Network ready to run out of the box. Server is a Websocket server-side protocol to allow communication from multiple machines.

## How It Works

Each Ulixee tool creates connection details to handle its internal connections.

Ulixee Cloud currently uses Websockets and allows each tool's Core to handle details of what is transported. Connections can optionally be shared by many operations. For instance, Hero allows a single connection to host multiple [Sessions](https://ulixee.org/docs/hero/advanced/session) if the [`ConnectionToCore`](https://ulixee.org/docs/hero/advanced/connection-to-core) is reused by many Hero instances.

## Installation

To use Ulixee Cloud in your project, install it with npm (or your package manager of choice):

```bash
npm i --save @ulixee/cloud
```

When you install Cloud, it installs [`Hero`](//ulixee.org/docs/hero), [`Datastore`](//ulixee.org/docs/datastore) and [`Desktop`](https://github.com/ulixee/desktop) Core (a tool to enhance the Hero Development process).

## Command Line Interface (CLI)

You can launch a Cloud instance from an npm script or the command line using the CLI. The following command is added to your local bin if you have `@ulixee/cloud` as a dependency:

```json
{
  "scripts": {
    "ulixee-start": "@ulixee/cloud start"
  }
}
```

You can run the start command from the command line as `npx @ulixee/cloud start`.

### Command Options:

- `-p, --port <number>` The port to use. Defaults to any 1818, or any available port. (env: `PORT`)
- `-u, --hostname <hostname>` The hostname the Cloud node should listen on. (env: `ULX_HOSTNAME`)
- `--public-host <address>` The public dns name or ip the Cloud node can be addressed with (env: `ULX_PUBLIC_HOST`)
- `--hosted-services-port <number>` Activate hosted services on this node at this port (datastore registry, node registry). Defaults to any 18181, or any available port
  (0). (env: `ULX_HOSTED_SERVICES_PORT`)
- `--hosted-services-hostname <hostname>` The ip or host that Cluster Services should listed on. You should make this a private-to-your-cloud ip if possible. (default:
  localhost) (env: `ULX_HOSTED_SERVICES_HOSTNAME`)
- `--setup-host <host>` Setup services for this node with another node in your cluster. NOTE: this should be the hosted services address of your cluster
  node. (env: `ULX_SERVICES_SETUP_HOST`)
- `--env <path>` Load environment settings from a .env file.
- `--network-identity-path <path>` Filesystem path to your network identity keypair (env: `ULX_NETWORK_IDENTITY_PATH`)
- `--admin-identities <ids...>` Comma separated list of admin identity public ids (starting with id1) (env: `ULX_CLOUD_ADMIN_IDENTITIES`)
- `--disable-chrome-alive` Do not enable ChromeAlive! even if installed locally.
- `--max-concurrent-heroes <count>` Max number of concurrent Datastores/Heroes to run at a time. (default: 10)
- `--max-datastore-runtime-ms <millis>` Max runtime allowed for a Datastore to complete. (default: 10 mins)
- `--unblocked-plugins <plugins...>` Register default Unblocked Plugin npm module names for all Hero instances to load.
- `-d, --hero-data-dir <dir>` Override the default data directory for Hero sessions and dbs.
- `-s, --datastore-storage-dir <dir>` Override the default storage directory where Datastores are located.
- `-t, --datastore-tmp-dir <dir>` Override the default temp directory where uploaded Datastores are processed.
- `-w, --datastore-wait-for-completion` Wait for all in-process Datastores to complete before shutting down a Cloud node. (default: false)

### Global CLI

The Ulixee CLI allows you to start a Ulixee Cloud-node. To use it, first install the cli globally.
`npm -i -g @ulixee/cli`

Now you can run the following command from your project directory with any of the options described above:
`ulixee cloud start`

## Usage Example

Starting a Ulixee Cloud is very similar to starting a NodeJs Http Server, except it is promise-based.

```js
import { CloudNode } from '@ulixee/cloud';

(async () => {
  const cloudNode = new CloudNode();
  await cloudNode.listen();
})();
```

To refer to this Cloud in a Hero client, you can supply the host string to the constructor.

NOTE: connection details on a local machine are optional. If you don't supply any connection detail, Hero and Datastore will connect to the local host.

```js
import Hero from '@ulixee/hero';

(async () => {
  const hero = new Hero({ connectionToCore: 'ws://localhost:1818' });
  await hero.goto('https://example.org');
  await hero.close();
})();
```
