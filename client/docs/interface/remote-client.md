# Remote Client

This is the default use-case for using Ulixee Client. You supply a connection URI or Object to the datastore you want to query. 

You can also initialize clients with a local Datastore, Table, Function or Crawler instance, however, these clients provide a more limited set of properties and methods than what is shown on this page. See [Local Client](./local-client.md).

## Constructor

### new Client _(uriOrObject)_ {#constructor}

Creates a new Client instance.

#### **Arguments**:

- uri `string` | `Object`. A connection string in the format of `ulx://USERNAME:PASSWORD@HOST:PORT/DB`. You can also supply
an object with the following properties:
  - username `string` 
  - password `string`
  - host `string`
  - port `number`
  - database `string`

```js
import Client from '@ulixee/client-playground';

const client = new Client({
  username: 'test',
  password: 'test',
  host: 'localhost',
  port: 1818,
  database: 'test',
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
const records = await client.fetch('developers' { lastname: 'Clark' });
```

#### **Arguments**:

- tableName `string`. The name of the remote table you want to query. Case sensitive.
- inputFilter `object`. Optional. Any column/values you want to filter on.

#### **Returns**: `Promise<Record[]>`

### client.run _(runnerName, inputFilter)_ {#run}

Run one of the Datastore's functions (what we call them Runners):

```js
const client = new Client();
const records = await client.fetch('daysUntilWorldDomination' { probability: 5 });
```

#### **Arguments**:

- runnerName `string`. Any valid Ulixee SQL query. Case sensitive.
- inputFilter `object`. Optional. Any named arguments required or allowed by the function.

#### **Returns**: `Promise<Record[]>`


### client.crawl _(crawlerName, inputFilter)_ {#crawl}

Trigger one of the Datastore's crawlers:

```js
const client = new Client();
const records = await client.fetch('ulixee' { page: 'Home' });
```

#### **Arguments**:

- crawlerName `string`. The name of the crawler. Case sensitive.
- inputFilter `object`. Optional. A key/value object that will be passed to the crawler as input.

#### **Returns**: `Promise<Record[]>`
