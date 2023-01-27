# Local Client

When developing a new Datastore, sometimes you'll want to test your code by querying specific Runners and Tables or even the entire Datastore. You can initialize a new Client by passing one of these instances directly into the constructor. This allows you to interact with your new Datastore (or parts of it) without needing to build and deploy the entire Datastore to a Cloud Node.

You'll use different Clients depending on what you're testing (Datastore vs Table, etc). Also, each Client provides a different subset of methods that are available. See below...

## Client.ForDatastore

```javascript
import Client from '@ulixee/client-playground';
import myDatastore from './myDatastore';

const client = new Client.ForDatastore(myDatastore);
client.query('SELECT firstName, lastName FROM testers WHERE lastName=$1', ['Jordan']).then(records => {
  console.log(records);
});
```

### client.query _(sql, boundValues)_ {#query}

Send a SQL query to the datastore. 

#### **Arguments**:

- sql `string`. Any valid Ulixee SQL query
- boundValues `array`. Optional. Values you want to use in your sql query

#### **Returns**: `Promise<Record[]>`

### client.fetch _(tableName, inputFilter)_ {#fetch}

Send a NoSQL query to the specified table.

#### **Arguments**:

- tableName `string`. The name of the remote table you want to query. Case sensitive.
- inputFilter `object`. Optional. Any column/values you want to filter on.

#### **Returns**: `Promise<Record[]>`


### client.run _(runnerName, inputFilter)_ {#run}

Run one of the Datastore's functions.

#### **Arguments**:

- runnerName `string`. Any valid Ulixee SQL query. Case sensitive.
- inputFilter `object`. Optional. Any named arguments required or allowed by the function.

#### **Returns**: `Promise<Record[]>`


### client.crawl _(crawlerName, inputFilter)_ {#crawl}

Trigger one of the Datastore's crawlers.

#### **Arguments**:

- crawlerName `string`. The name of the crawler. Case sensitive.
- inputFilter `object`. Optional. A key/value object that will be passed to the crawler as input.

#### **Returns**: `Promise<Record[]>`
 

## Client.ForFunction

```javascript
import Client from '@ulixee/client-playground';
import myFunction from './myFunction';

const client = new Client.ForFunction(myFunction);
client.query('SELECT firstName, lastName FROM self(isTesting => $1), [true]).then(records => {
  console.log(records);
});
```

### client.run _(inputFilter)_ {#run}

Run the function.

#### **Arguments**:

- inputFilter `object`. Optional. Any named arguments required or allowed by the function.


### client.query _(sql, boundValues)_ {#query}

Send a SQL query to the table. You can use `self` as an alias for the table name.

#### **Arguments**:

- sql `string`. Any valid Ulixee SQL query
- boundValues `array`. Optional. Values you want to use in your sql query

#### **Returns**: `Promise<Record[]>`



## Client.ForTable

```javascript
import Client from '@ulixee/client-playground';
import myTable from './myTable';

const client = new Client.ForTable(testingTable);
client.query('SELECT firstName, lastName FROM self WHERE lastName=$1', ['Jordan']).then(records => {
  console.log(records);
});
```

### client.fetch _(inputFilter)_ {#fetch}

Send a NoSQL query to the table.

#### **Arguments**:

- inputFilter `object`. Optional. Any column/values you want to filter on.

#### **Returns**: `Promise<Record[]>`



### client.query _(sql, boundValues)_ {#query}

Send a SQL query to the table. You can use `self` as an alias for the table name.

#### **Arguments**:

- sql `string`. Any valid Ulixee SQL query
- boundValues `array`. Optional. Values you want to use in your sql query

#### **Returns**: `Promise<Record[]>`



## Client.ForCrawler

```javascript
import Client from '@ulixee/client-playground';
import myCrawler from './myCrawler';

const client = new Client.ForCrawler(myCrawler);
client.query('SELECT sessionId FROM self WHERE page=$1', ['Home']).then(records => {
  console.log(records);
});
```

### client.crawl _(inputFilter)_ {#crawl}

Trigger the crawler.

#### **Arguments**:

- inputFilter `object`. Optional. A key/value object that will be passed to the crawler as input.

#### **Returns**: `Promise<Record[]>`
 