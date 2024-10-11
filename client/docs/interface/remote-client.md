# Remote Client

This is the default use-case for using Ulixee Client. You supply a connection URI or Object to the datastore you want to query.

You can also initialize clients with a local Datastore, Table, Extractor or Crawler instance, however, these clients provide a more limited set of properties and methods than what is shown on this page. See [Local Client](./local-client.md).

## Constructor

### new Client _(uriOrObject, config?)_ {#constructor}

Creates a new Client instance.

#### **Arguments**:

- uri `string` | `Object`. A connection string in the format of `ulx://USERNAME:PASSWORD@HOST:PORT/DB`. You can also supply
  an object with the following properties:
  - username `string`
  - password `string`
  - host `string`
  - port `number`
  - database `string`
- config `Object`. Optional. Configuration options
  - paymentService `IPaymentService`. Optional. A [payment service](/docs/datastore/basics/payments#payment-services) to use for transactions.
  - argonMainchainUrl `string`. Optional. The RPC URL of an Argon Mainchain node to use for looking up notary information for micropayment channel holds.
  - authentication `Object`. Optional. An object with the following properties:
  - identity `string`. A bech32 encoded Ed25519 key
  - signature `string`. A signature of the identity
  - nonce `string`. A nonce to prevent replay attacks
  - affiliateId `string`. Optional. An affiliate ID to allow your queries to be tracked (often used in cloned Datastores to request funding)
  - onQueryResult `(IDatastoreQueryResult) => void`. Optional. A callback function that will be called with the result of every query. The result has the latestVersion, metadata, and output/error.
  - queryId `string`. Optional. A unique identifier for the query. If not provided, one will be generated.

```js
import Client from '@ulixee/client';

const client = new Client({
  username: 'test',
  password: 'test',
  host: 'localhost',
  port: 1818,
  database: 'test',
});
```

Example using a Payment Service:

```typescript
import { DefaultPaymentService } from '@ulixee/databroker';
import Client from '@ulixee/client';

const paymentService = await DefaultPaymentService.fromBroker('wss://broker.testnet.ulixee.org', {
  pemPath: 'path to your Identity pem file',
});
const client = new Client('ulx://UsCPI.Stats/v1.0.0', {
  paymentService,
  argonMainchainUrl: 'wss://rpc.testnet.argonprotocol.org',
});
```

## Properties

### client.username {#username}

The username authenticated with the remote server.

#### **Type**: `string`

### client.password {#password}

The password used to authenticate with the remote server.

#### **Type**: `string`

### client.host {#host}

The host of the remote server. Defaults to localhost.

#### **Type**: `string`

### client.port {#port}

The port sent of the remote server. Defaults to 1818.

#### **Type**: `number`

### client.database {#database}

The name of the datastore the client is connected.

#### **Type**: `string`

## Methods

### client.query _(sql, boundValues)_ {#query}

Send a SQL query to the remote datastore. You can optionally attach bound values:

```js
const client = new Client();
const records = await client.query('SELECT * FROM developers WHERE lastName=$1', ['Clark']);
```

#### **Arguments**:

- sql `string`. Any valid Ulixee SQL query
- boundValues `array`. Optional. Values you want to use in your sql query

#### **Returns**: `Promise<Record[]>`

### client.fetch _(tableName, inputFilter)_ {#fetch}

Send a NoSQL query to the specified table:

```js
const client = new Client();
const records = await client.fetch('developers', { lastname: 'Clark' });
```

#### **Arguments**:

- tableName `string`. The name of the remote table you want to query. Case sensitive.
- inputFilter `object`. Optional. Any column/values you want to filter on.

#### **Returns**: `Promise<Record[]>`

### client.run _(extractorName, inputFilter)_ {#run}

Run one of the Datastore's extractors (what we call them Extractors):

```js
const client = new Client();
const records = await client.fetch('daysUntilWorldDomination', { probability: 5 });
```

#### **Arguments**:

- extractorName `string`. Any valid Ulixee SQL query. Case sensitive.
- inputFilter `object`. Optional. Any named arguments required or allowed by the extractor.

#### **Returns**: `Promise<Record[]>`

### client.crawl _(crawlerName, inputFilter)_ {#crawl}

Trigger one of the Datastore's crawlers:

```js
const client = new Client();
const records = await client.fetch('ulixee', { page: 'Home' });
```

#### **Arguments**:

- crawlerName `string`. The name of the crawler. Case sensitive.
- inputFilter `object`. Optional. A key/value object that will be passed to the crawler as input.

#### **Returns**: `Promise<Record[]>`
