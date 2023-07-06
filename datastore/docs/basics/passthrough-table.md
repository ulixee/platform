# Passthrough Table

A PassthroughTable allows you to extend other Datastore Tables published across the web. Passthrough Tables cannot manipulate the underlying schema. They're a simple construct to preserve functionality available in the `upstream` Datastore.

### An Example

The following is a simple example:

##### Table 1 Published to a CloudNode at `153.23.22.255:8080`:

```js
import Datastore, { Schema, Table } from '@ulixee/datastore';
const { string } = Schema;

export default new Datastore({
  id: `people`,
  version: '1.0.0',
  tables: {
    users: new Table({
      schema: {
        firstName: string(),
        lastName: string(),
      },
      seedlings: [
        {
          firstName: 'John',
          lastName: 'Doe',
        },
      ],
    }),
  },
});
```

##### Table 2:

```js
import Datastore, { PassthroughTable } from '@ulixee/datastore';

const datastore = new Datastore({
  // NOTE: this is not a real hosted Datastore
  remoteDatastores: {
    source: `ulx://153.23.22.255:8080/people/1.0.0`,
  },
  tables: {
    table2: new PassthroughTable({
      remoteTable: `source.users`,
    }),
  },
});

// will print records from `users` table `[{ firstName: 'John', lastName: 'Doe' }]`
datastore.tables.table2.queryInternal(`select * from self`).then(console.log);
```

## Constructor

### new PassthroughTable _(components)_ {#constructor}

Creates a new PassthroughTable instance.

#### **Arguments**:

Components contains all of the parameters from a [Table](./table.md#constructor) constructor, with one addition:

- remoteTable `string`. Required remoteTable name to source. This string must start with the name of the `remoteDatastores` key as defined in [Datastore.remoteDatastores](./datastore.md#remote-datastores).
