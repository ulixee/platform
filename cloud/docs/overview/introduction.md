# Introduction

> Ulixee is a Scraping Data Collection Network ready to run out of the box. Server is a Websocket server-side protocol to allow communication from multiple machines.

## How It Works

Each Ulixee tool creates connection details to handle its internal connections.

Ulixee Miner currently uses Websockets and allows each tool's Core to handle details of what is transported. Connections can optionally be shared by many operations. For instance, Hero allows a single connection to host multiple [Sessions](https://ulixee.org/docs/hero/advanced/session) if the [`ConnectionToCore`](https://ulixee.org/docs/hero/advanced/connection-to-core) is reused by many Hero instances.

## Installation

To use Miner in your project, install it with npm or yarn:

```bash
npm i --save @ulixee/miner
```

or

```bash
yarn add @ulixee/miner
```

When you install Miner, it requires PeerDependencies of [`Hero`](https://ulixee.org/docs/hero) and [`Datastore`](https://ulixee.org/docs/datastore).

It will also optionally use a PeerDependency `ChromeAlive!` Core (`@ulixee/desktop-core`). This tool enhances the Hero Development process.

## Command Line Interface (CLI)

You can launch a Miner instance from an npm script or the command line using the CLI. The following command is added to your local bin if you have `@ulixee/miner` as a dependency:

```json
{
  "scripts": {
    "ulixee-start": "@ulixee/miner start"
  }
}
```

You can run the start command from the command line as `npx @ulixee/miner start`.

### Command Options:

- `-p, --port <number>` The port to use. Defaults to any available port.
- `-h, --host <host>` The host the miner should listen on. (default: localhost)
- `-x, --disable-chrome-alive` Do not enable ChromeAlive! even if installed locally.
- `-m, --max-concurrent-heroes <count>` Max number of concurrent Datastores/Heroes to run at a time. (default: 10)
- `-r, --max-datastore-runtime-ms <millis>` Max runtime allowed for a Datastore to complete. (default: 10 mins)
- `-u, --unblocked-plugins <plugins...>` Register default Unblocked Plugin npm module names for all Hero instances to load.
- `-d, --hero-data-dir <dir>` Override the default data directory for Hero sessions and dbs.
- `-s, --datastore-storage-dir <dir>` Override the default storage directory where Datastores are located.
- `-t, --datastore-tmp-dir <dir>` Override the default temp directory where uploaded Datastores are processed.
- `-w, --datastore-wait-for-completion` Wait for all in-process Datastores to complete before shutting down a Miner. (default: false)

### Global CLI

The Ulixee CLI allows you to start a Ulixee Miner. To use it, first install the cli globally.
`npm -i -g @ulixee/cli`

Now you can run the following command from your project directory with any of the options described above:
`ulixee miner start`

## Usage Example

Starting a Ulixee Miner is very similar to starting a NodeJs Http Server, except it is promise-based.

```js
import Miner from '@ulixee/miner';

(async () => {
  const miner = new Miner();
  await miner.listen({ port: 8080 });
})();
```

To refer to this Miner in a Hero client, you can supply the host string to the constructor.

NOTE: connection details on a local machine are optional. If you don't supply any connection detail, Hero and Datastore will connect to the local host.

```js
import Hero from '@ulixee/hero';

(async () => {
  const hero = new Hero({ connectionToCore: { host: 'ws://localhost:8080' } });
  await hero.goto('https://example.org');
  await hero.close();
})();
```
