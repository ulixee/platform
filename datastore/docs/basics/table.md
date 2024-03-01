# Table

A Table is a storage mechanism for structured data records (just like a SQL Database table). The following is a simple example:

```js
import { Table } from '@ulixee/datastore';

const table = new Table({
  schema: {
    title: string(),
    success: boolean(),
  },
  async onCreated() {
    await this.insertInternal(
      { title: 'Hello', success: true },
      { title: 'World', success: false },
    );
  },
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
- isPublic `boolean`. Optional parameter to make a table private. This means it can only be accessed by other [Extractors](./extractor.md) and [Crawlers](./crawler.md) in the same [Datastore](./datastore.md).
- basePrice `number`. Optional charge price per query.
- onCreated `function`. A function run when the Table is installed onto a StorageEngine. This is where you can seed any records in the engine. More details are [here](#on-created).
- onVersionMigrated `function`. A function run when a Table is installed onto a StorageEngine and there is a previous version of the Table. This is a function to perform "migrations" and copy any data from the previous version that you want. More details are [here](#on-version-migrated)
- name `string`. Optional name for this Table, primarily used only if defining a Table outside a Datastore.
- description `string`. Optional description to use for documentation of the Table.

### onCreated _()_ {#on-created}

An optional callback that can be used to bootstrap a Table when it's installed onto a Storage Engine. This method allows you to seed the table. It will be called only once.

The callback is called from the context of the Table object, so you can directly use the table's methods.

```js
import Datastore from '@ulixee/datastore';

const whitelist = new Set([`id1xv7empyzlwuvlshs2vlf9eruf72jeesr8yxrrd3esusj75qsr6jqj6dv3p`]);

export default new Datastore({
  tables: {
    events: new Table({
      schema: {
        name: string(),
        date: date(),
      },
    }),
    async onCreated() {
      await this.insertInternal({
        name: 'Thanksgiving',
        birthdate: new Date('2023-11-01'),
      });
    },
  },
});
```

### onVersionMigrated _(previousVersion)_ {#on-version-migrated}

An optional callback that will be called when this Table is installed onto a Storage Engine where a previous Table version exists. All tables start off empty for each version, so you must copy any data you want to keep from the previous Datastore Table.

This callback will only be called once, and only if a previous version is on the cloud where it will be installed.

#### **Arguments**:

- previousVersion `Table`. The previous linked version of a table with the samename.

Below is simple example for migrating data to the new table by filling in the new columns.

NOTE: since each Datastore version creates a new copy of the table, you can test migrations locally by pointing at your previous version and testing out migrating to a new one.

```js
import Datastore from '@ulixee/datastore';

export default new Datastore({
  tables: {
    events: new Table({
      schema: {
        name: string(),
        reason: string({ enum: ['fun', 'work'] }),
        date: date(),
      },
      async onVersionMigrated(previousTable) {
        const previousEvents = await previousTable.fetchInternal();
        for (const previousEvent of previousEvents) {
          await this.insertInternal(
            ...previousEvents.map(x => ({
              ...x,
              reason: 'fun',
            })),
          );
        }
      },
    }),
  },
});
```

## Methods

### queryInternal _ (sql, boundValues)_ {#query}

Internal method to query the table. This method can be used without attaching a Table to any Datastore if you wish to test it out. Your table name can optionally be `self` in this method.

#### **Arguments**:

- sql `string`. A `SELECT`, `UPDATE`, `DELETE` or `INSERT` Sql query. SQL parameters must use "named" access starting at index 1 (eg, `UPDATE records SET item=$1 where key=$2`).
- boundValues `any[]`. An array of javascript values to query by. Position 0 will fill `$1` in the query. All arguments are sanitized for security and converted to be compatible with the underlying SQL engine.

#### Return Promise<any>. A promise containing the results of the SQL query.

### fetchInternal _ (filter)_ {#fetch}

Internal method to fetch records from the table. This method accepts where clause "inputs" only.

#### **Arguments**:

- filter `object`. Record containing any key/values you wish to filter with.

#### Return Promise<[]>. A promise containing the records returned from the filter.
