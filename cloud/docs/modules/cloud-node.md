# Ulixee CloudNode

Ulixee CloudNode is an out-of-the-box way to publish and deploy Ulixee Hero scripts and Datastores. Websockets are used as the underlying protocol on port 1818 (if available).

You should start `Ulixee CloudNode` in a node process that you intend to keep alive. This process will automatically integrate `@ulixee/hero-core` and `ChromeAlive!` if it's installed.

```js
import { CloudNode } from '@ulixee/cloud';

(async () => {
  const cloudNode = new CloudNode({
    port: 1818,
  });
  await cloudNode.listen();

  console.log(`CloudNode started on port ${await cloudNode.port}`);
})().catch(error => {
  console.log('ERROR starting Ulixee CloudNode', error);
  process.exit(1);
});
```

CloudNodes can be networked together into a "cloud". A cloud provides services to delegate storage and discovery tasks to certain nodes. These services are called the HostedServices of the cluster.

To network nodes, you can simply tell one node to activate hosted services, and the other to use the first node for service discovery.

```js
import { CloudNode } from '@ulixee/cloud';

(async () => {
  const servicesNode = new CloudNode({
    port: 1818,
    hostedServicesServerOptions: { port: 18181 }, // default services port
  });
  await servicesNode.listen();

  const childNode = new CloudNode({
    // resolves to localhost:18181
    servicesSetupHost: await servicesNode.hostedServicesServer.host,
  });
  await childNode.listen();
})().catch(error => {
  console.log('ERROR starting Ulixee CloudNode', error);
  process.exit(1);
});
```

## Constructor

### new CloudNode _(cloudConfiguration?)_ {#constructor}

Creates a new CloudNode instance.

#### **Arguments**:

- cloudConfiguration `ICloudConfiguration`. Optional configuration object.

  - port `number`. A port to listen on. Default `1818`. `0` will find any open port.
  - host `string`. An ip or domain name (if applicable) to bind the server to.
  - servicesSetupHost `string`. An ip:port to dial to discover hosted services to use.
  - nodeRegistryHost `string` | `self`. A service used to track CloudNode health. If `self`, will be set to this server's `hostedServicesServer.host` after it starts.
  - networkIdentity `Identity`. An Identity (Ed25519 keypair) used to secure network services.
  - hostedServicesServerOptions: `object`. Options for the HostedServices server:

    - port `number`. A port to expose hosted service apis on. Defaults to `18181`. Setting this value will activate hosted services. `0` will find any open port.
    - host. `string`. An ip or domain to bind the hosted services to. You might want this to be an ip `private` to your servers to keep them internal.

  - shouldShutdownOnSignals `boolean`. Default `true`. Set to false to disable automatically shutting down the CloudNode and all dependent services on process signals (eg, 'exit', `SIGINT`, `SIGTERM`, `SIGQUIT`). If you disable this process, you should calls [cloudNode.close()](#close) in your own process handling.
  - datastoreConfiguration `object`. Any configuration you wish to apply to [Datastore Core](https://ulixee.org/docs/datastore)
  - heroConfiguration `object`. Any configuration you wish to apply to [Hero Core](https://ulixee.org/docs/hero)

## Properties

### cloudNode.datastoreCore {#datastore}

The DatastoreCore created by this node.

#### **Type**: [`DatastoreCore`](https://ulixee.org/docs/datastore)

### cloudNode.heroCore {#hero}

The HeroCore created by this node.

#### **Type**: [`HeroCore`](https://ulixee.org/docs/hero)

### cloudNode.hostedServicesServer {#hosted-services-server}

Returns the HostedServices Server, if configured.

#### **Type**: `RoutableServer`

### cloudNode.hostedServicesHostURL {#hosted-services-url}

Returns the URL to the hosted Services _used_ by this node if acting as a client.

#### **Type**: `URL`

### cloudNode.host {#address}

Returns the host the cloudNode, ie `localhost:1778`.

NOTE: will not return until `listen` is called.

#### **Type**: `Promise<string>`

### cloudNode.port {#port}

Returns the public api port the cloudNode, ie `1818`.

NOTE: will not return until `listen` is called.

#### **Type**: `Promise<number>`

### cloudNode.publicServer {#public-server}

Returns the Public Api Server.

#### **Type**: `RoutableServer`

## Methods

### cloudNode.listen _()_ {#listen}

Start the cloudNode and any installed modules (eg, Hero, ChromeAlive)

#### **Returns**: `Promise<CloudNode>` - returns the started CloudNode.

### cloudNode.close _()_ {#close}

Closes the cloudNode and all dependencies.

#### **Arguments**:

- closeDependencies `boolean`. Should the cloudNode close sub-dependencies (eg, Hero Core)

#### **Returns**: `Promise`
