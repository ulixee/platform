# Server

Server is an out-of-the-box way to create a Cross-machine interface into Ulixee tools like Hero, Databox and Runner. Websockets are used as the underlying protocol.

You should start `Server` in a node process that you intend to keep alive. This process will automatically integrate `@ulixee/hero-core` and `ChromeAlive!` if it's installed.

```js
import Server from '@ulixee/server';

(async () => {
  const server = new Server();
  await server.listen({ port: 8080 });
  return server;
  console.log(`Server started on port ${await server.port}`);
})().catch(error => {
  console.log('ERROR starting Ulixee Server', error);
  process.exit(1);
});
```

## Constructor

### new Server *(addressHost)* {#constructor}

Creates a new Server instance.

#### **Arguments**:

- addressHost `string`. A "hostname" that will be used to access the server. This will be used in the Websocket address of the server.

## Properties

### server.address {#address}

Returns the full address of the server, ie `ws://localhost:1778`.

NOTE: will not return until `listen` is called.

#### **Type**: `Promise<string>`

### server.port {#port}

Returns the port the server, ie `1778`. 

NOTE: will not return until `listen` is called.

#### **Type**: `Promise<number>`

### server.hasConnections {#has-connections}

Returns true if the server has active connections

#### **Type**: `Promise<boolean>`

## Methods

### server.listen *(listenOptions)* {#listen}

Start the server and any installed modules (eg, Hero, ChromeAlive)

#### **Arguments**:

- listenOptions `net.ListenOptions`. NodeJs listen options. If none provided, a default port will be assigned to the server.

#### **Returns**: `Promise<AddressInfo>` - returns the address the server has been started on.

### server.close *(closeDependencies)* {#close}

Closes the server and all dependencies.

#### **Arguments**:

- closeDependencies `boolean`. Should the server close sub-dependencies (eg, Hero Core)

#### **Returns**: `Promise`
