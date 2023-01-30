# Table

A Table is a storage mechanism for structured data records (just like a SQL Database table). The following is a simple example:

```js
import { Table } from '@ulixee/datastore';

const table = new Table({
  schema: {
    title: string(),
    success: boolean(),
  },
  seedlings: [
    { title: 'Hello', success: true },
    { title: 'World', success: false },
  ],
});

// will log { title: 'Hello', success: true }
table.queryInternal(`select * from self where success=$1`, [true]).then(console.log);
```

## Constructor

### new Table _(components)_ {#constructor}

Creates a new Table instance.

#### **Arguments**:

Components contains the following properties.

- schema `ISchema`. A [schema](../advanced/schema.md) defining the column definitions for the table.
- isPublic `boolean`. Optional parameter to make a table private. This means it can only be accessed by other [Runners](./runner.md) and [Crawlers](./crawler.md) in the same [Datastore](./datastore.md).
- pricePerQuery `number`. Optional charge price per query.
- seedlings `TSeedlings[]`. Optional definition for bootstrapped records that should be installed into the table.
- name `string`. Optional name for this Table, primarily used only if defining a Table outside a Datastore.
- description `string`. Optional description to use for documentation of the Table.

## Methods

### queryInternal _ (sql, boundValues)_ {#query}

Internal method to query the table. This method can be used without attaching a Table to any Datastore if you wish to test it out. Your table name can optionally be `self` in this method.

#### **Arguments**:

- sql `string`. A `SELECT`, `UPDATE`, `DELETE` or `INSERT` Sql query. SQL parameters must use "named" access starting at index 1 (eg, `UPDATE records SET item=$1 where key=$2`).
- boundValues `any[]`. An array of javascript values to query by. Position 0 will fill `$1` in the query. All arguments are sanitized for security and converted to be compatible with the underlying SQL engine.

#### Return Promise<any>. A promise containing the results of the SQL query.
