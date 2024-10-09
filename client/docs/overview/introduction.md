# Introduction

> Ulixee Client is the main tool for querying and interacting with Datastores.

Client supports both [SQL](./sql) and [NoSQL](./no-sql) capabilities. 

SQL Example:

```javascript
import Client from '@ulixee/client';

const client = new Client('ulx://USERNAME:PASSWORD@DOMAIN:PORT/DATABASE');
client.query(`SELECT * FROM developers WHERE status='founder'`).then(records => {
  console.log(records);
});
```

NoSQL Example:

```javascript
import Client from '@ulixee/client';

const client = new Client('ulx://USERNAME:PASSWORD@DOMAIN:PORT/DATABASE');
client.fetch('developers', { status: 'founders' }).then(records => {
  console.log(records);
});
```

You can also use Client with local datastores/tables/extractors/crawlers while in development mode:

```javascript
import Client from '@ulixee/client';
import { Table, string } from '@ulixee/datastore';

const testingTable = new Table({
  schema: {
    firstName: string(),
    lastName: string(),
  },
  seedlings: [
    { firstName: 'Dennis', lastName: 'Rodman' },
    { firstName: 'Michael', lastName: 'Jordan' },
  ],
});

const client = new Client(testingTable);
client.query('SELECT * FROM self WHERE lastName=$1', ['Jordan']).then(records => {
  console.log(records);
});
```
