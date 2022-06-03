# Introduction

> Ulixee is a Scraping Data Collection Network ready to run out of the box. Server is a Websocket server-side protocol to allow communication from multiple machines.

## How It Works

Each Ulixee tool creates connection details to handle its internal connections.

Server currently uses Websockets and allows each tool's Core to handle details of what is transported. Connections can optionally be shared by many operations. For instance, Hero allows a single connection to host multiple [Sessions](/docs/hero/advanced/session) if the [`ConnectionToCore`](/docs/hero/advanced/connection-to-core) is reused by many Hero instances.

## Installation

To use Server in your project, install it with npm or yarn:

```bash
npm i --save @ulixee/server
```

or

```bash
yarn add @ulixee/server
```

When you install Server, it requires a PeerDependency of [`Hero`](/docs/hero).

It will also optionally use a PeerDependency `ChromeAlive!` Core (`@ulixee/apps-chromealive-core`). This tool enhances the Hero Development process.

## Usage Example

Starting a Ulixee Server is very similar to starting a NodeJs Http Server, except it is promise-based.

```js
import Server from '@ulixee/server';

(async () => {
  const server = new Server();
  await server.listen({ port: 8080 });
})();
```

To refer to this server in a Hero client, you can supply the host string to the constructor.

```js
import Hero from '@ulixee/hero';

(async () => {
  const hero = new Hero({ connectionToCore: { host: 'ws://localhost:8080' } });
  await hero.goto('https://example.org');
  await hero.close();
})();
```
