# Postgres Client

Postgres is an emmensly popular SQL database. You can use any Postgres client from any language to query Ulixee. Of course, only the Ulixee SQL subset is supported within the queries.

Below is an example of a Ulixee SQL query using a Postgres client:

```js
import { Client } from 'pg';

const new Client('postgres://');
client.connect(() => {
  const { rows } = await client.query(`SELECT * FROM table WHERE lastName='Clark'`);
  console.log('OUTPUT: ', rows);
});
```

You'll need to start the Ulixee Server before running the above code:

```shell
% npx @ulixee/server-playground start
```