# Datastore

This is the primary class used to create a datastore. The following is a simple example:

```js
import Datastore from '@ulixee/datastore';

export default new Datastore({
  extractors: {
    nameOfExtractor: new Extractor(extractorContext => {
      extractorContext.Output.emit({ message: `Hello ${extractorContext.input.firstName}` });
    }),
  },
});
```

A Datastore is constructed with one or more [Extractors](./extractor.md).

## Constructor

### new Datastore _(datastoreComponents)_ {#constructor}

Creates a new Datastore instance.

#### **Arguments**:

- datastoreId `string`. The unique id of this Datastore. Required for deployment.
- version `string`. A semver string for the Datastore version.
- name `string`. Optional name for this Datastore to be used in Documentation websites.
- description `string`. Optional description for this Datastore to be used in Documentation websites.
- storageEngineHost `string`. The ip:port where storage engine requests should be sent. NOTE: you MUST set this property when deploying into a cluster of nodes.
- domain `string`. A dns name (eg, A record) that maps to the Datastore host. This domain will act as a virtual host mapped to the latest deployed version of this Datastore. Documentation sites and credit urls can be distributed to users with this domain. NOTE that this is unique _per_ Datastore. You may only use it for a single Datastore version. If you have a custom port, it should _not_ be added to this variable, but will be appended to any urls you distribute (eg, `mydns.com -> 192.168.1.1`, `npx @ulixee/datastore credits install https://mydns.com:1818/free-credits?crd2234343:234234ssd3234`).
- extractors: `object`. An object mapping names to [Extractors](./extractor.md).
  - key `string`. A unique name of the function.
  - value `Extractor`. A [Extractor](./extractor.md) instance.
- crawlers: `object`. An object mapping names to [Crawlers](./crawler.md).
  - key `string`. A unique name of the Crawler.
  - value `Crawler`. A [Crawler](./crawler.md) instance.
- tables `object`. An object mapping names to [Tables](./table.md).
  - key `string`. A unique name of the Table.
  - value `Table`. A [Table](./table.md) instance.
- affiliateId `string`. An optional unique identifier to send with all remoteDatastore queries sent from this Datastore.
- adminIdentity `string`. A bech32 encoded admin Identity. Grants access to this identity to perform signed `Datastore.admin` API calls (like managing [Credits](../advanced/credits.md)). If not included, the `adminIdentities` of your CloudNode server are the only valid admin Identities for your Datastore.
- authenticateIdentity `function`. An optional function that can be used to secure access to this Datastore. More details are [here](#authenticateIdentity)
- onCreated `function`. A function run when a datastore is installed onto a StorageEngine. This is where you can seed any records in the database. More details are [here](#on-created).
- onVersionMigrated `function`. A function run when a datastore is installed onto a StorageEngine and there is a previous version. This is a function to perform "migrations" and copy any data from the previous version that you want. More details are [here](#on-version-migrated)
- remoteDatastores `{ [name]: url }`. An optional key/value of remoteDatastore "names" to urls of the remoteDatastore used as part of [PassthroughExtractors](./passthrough-extractor.md).
- remoteDatastoreEmbeddedCredits `{ [name]: ICredit }`. An optional key/value of remoteDatastore "names" to [credit](../advanced/credits.md) details (`id` and `secret`). If included, the embedded credits will be used for Payment to the remoteDatastore for consumers of this Datastore.

```js
import Datastore, { Extractor } from '@ulixee/datastore';

export default new Datastore({
  id: 'test',
  version: '0.0.1',
  extractors: {
    instance: new Extractor({
      run({ input, Output }) {
        const output = new Output();
        output.urlLength = input.url.length;
      },
      schema: {
        input: {
          url: string({ format: 'url' }),
        },
        output: {
          urlLength: number(),
        },
      },
    }),
  },
});
```

## Properties

### metadata `object`

Object containing the definitions of nested Extractors, Crawlers, Tables and settings for this Datastore.

### extractors `{ [name:string]: Extractor}`

Object containing [Extractors](./extractor.md) keyed by their name.

### crawlers `{ [name:string]: Crawler}`

Object containing [Crawlers](./crawler.md) keyed by their name.

### tables `{ [name:string]: Table}`

Object containing [Tables](./table.md) keyed by their name.

### remoteDatastores `{ [name]: url }` {#remote-datastores}

Object containing an optional key/value of remoteDatastore "names" to urls of the remoteDatastore used as part of [PassthroughExtractors](./passthrough-extractor.md). Urls take the format `ulx://<CloudAddress>/<datastoreId>@v<DatastoreVersion>`.

### authenticateIdentity _(identity, nonce)_ {#authenticateIdentity}

An optional callback that can be used to secure a Datastore. This method can allow you to issue private Identities to remote Datastore consumers and only allow those users to access your Datastore. An Identity can be created using the `@ulixee/crypto` cli:

```bash
 npx @ulixee/crypto identity create
```

A caller would use the generated Identity to create an authentication message:

```js
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import Identity from '@ulixee/crypto/lib/Identity';

const identity = Identity.loadFromFile('~/datastoreAuth.pem');
let payment = null; // fill in with payment if needed
// this authentication message will be passed to the Datastore queries.
const authentication = DatastoreApiClient.createExecAuthentication(payment, identity);
const client = new DatastoreApiClient();
await client.stream('test', '1.0.0', 'extractorName', { authentication });
```

Your Datastore can then only allow your distributed Identities:

```js
import Datastore from '@ulixee/datastore';

const whitelist = new Set([`id1xv7empyzlwuvlshs2vlf9eruf72jeesr8yxrrd3esusj75qsr6jqj6dv3p`]);

export default new Datastore({
  authenticateIdentity(identity, nonce) {
    return whitelist.has(identity);
  },
});
```

The Datastore Core will automatically ensure that any calling authentication messages include the following properties before passing the identity and nonce to your `authenticateIdentity` callback:

- identity `string`. A bech32 encoded Identity of the caller.
- signature `Buffer`. A valid Ed25519 signature providing proof of the Identity private key. The signature message is a sha3 of `Datastore.exec` + any `Credits Id` + any `Micronote Id` + the included `nonce`.
- nonce `string`. A unique nonce code. This nonce can be used for additional "unique" calls validation if desired.

### onCreated _()_ {#on-created}

An optional callback that can be used to bootstrap a Datastore when it's installed onto a Storage Engine. This method allows you to seed tables. It will be called only once.

The callback is called from the context of the Datastore instance, so you can navigate internal tables and columns.

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
  },
  async onCreated() {
    await this.tables.events.insertInternal({
      name: 'Thanksgiving',
      birthdate: new Date('2023-11-01'),
    });
  },
});
```

### onVersionMigrated _(previousVersion)_ {#on-version-migrated}

An optional callback that will be called when a Datastore version is installed onto a Storage Engine where a previous version exists. All storage engines start off empty for each version, so you must copy any data you want to keep from the previous Datastore.

This callback will only be called once, and only if a previous version is on the cloud where it will be installed. It will be called from the context of the Datastore instance, so you can navigate internal tables and columns.

#### **Arguments**:

- previousVersion `Datastore`. The previous linked version of this Datastore.

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
    }),
  },
  async onVersionMigrated(previousVersion) {
    for (const previousEvent of previousEvents) {
      await this.tables.events.insertInternal(
        ...previousEvents.map(x => ({
          ...x,
          reason: 'fun',
        })),
      );
    }
  },
});
```

## Methods

No public methods provided.
