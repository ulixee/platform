# Ulixee Miner

Ulixee Miner is an out-of-the-box way to publish and deploy Ulixee Hero scripts and Databoxes. Websockets are used as the underlying protocol.

You should start `Ulixee Miner` in a node process that you intend to keep alive. This process will automatically integrate `@ulixee/hero-core` and `ChromeAlive!` if it's installed.

```js
import UlixeeMiner from '@ulixee/miner';

(async () => {
  const miner = new UlixeeMiner();
  await miner.listen({ port: 8080 });
  return miner;
  console.log(`Miner started on port ${await miner.port}`);
})().catch(error => {
  console.log('ERROR starting Ulixee Miner', error);
  process.exit(1);
});
```

## Constructor

### new Miner *(addressHost)* {#constructor}

Creates a new Miner instance.

#### **Arguments**:

- addressHost `string`. A "hostname" that will be used to access the miner. This will be used in the Websocket address of the miner.

## Properties

### miner.address {#address}

Returns the full address of the miner, ie `ws://localhost:1778`.

NOTE: will not return until `listen` is called.

#### **Type**: `Promise<string>`

### miner.port {#port}

Returns the port the miner, ie `1778`. 

NOTE: will not return until `listen` is called.

#### **Type**: `Promise<number>`

### miner.hasConnections {#has-connections}

Returns true if the miner has active connections

#### **Type**: `Promise<boolean>`

## Methods

### miner.listen *(listenOptions)* {#listen}

Start the miner and any installed modules (eg, Hero, ChromeAlive)

#### **Arguments**:

- listenOptions `net.ListenOptions`. NodeJs listen options. If none provided, a default port will be assigned to the miner.

#### **Returns**: `Promise<AddressInfo>` - returns the address the miner has been started on.

### miner.close *(closeDependencies)* {#close}

Closes the miner and all dependencies.

#### **Arguments**:

- closeDependencies `boolean`. Should the miner close sub-dependencies (eg, Hero Core)

#### **Returns**: `Promise`