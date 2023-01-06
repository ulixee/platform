# Datastore

This is the primary class used to create a datastore. The following is a simple example:

```js
import Datastore from '@ulixee/datastore';

export default new Datastore({
  functions: {
    nameOfFunction: new Function(functionContext => {
      functionContext.output = `Hello ${functionContext.input.firstName}`;
    }),
  },
});
```

A Datastore is constructed with one or more [Functions](./function.md).

## Constructor

### new Datastore _(datastoreComponents)_ {#constructor}

Creates a new Datastore instance.

#### **Arguments**:

- functions: `object`. An object mapping names to [Functions](./function.md).
  - key `string`. A unique name of the function.
  - value `Function`. A [Function](./function.md) instance.
- crawlers: `object`. An object mapping names to [Crawlers](./crawler.md).
  - key `string`. A unique name of the Crawler.
  - value `Crawler`. A [Crawler](./function.md) instance.
- authenticateIdentity `function`. An optional function that can be used to secure access to this Datastore. More details are [here](#authenticateIdentity)
- remoteDatastores `{ [name]: url }`. An optional key/value of remoteDatastore "names" to urls of the remoteDatastore used as part of [PassthroughFunctions](./passthrough-function.md).

```js
import Datastore, { Function } from '@ulixee/datastore';

export default new Datastore({
  functions: {
    instance: new Function({
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

### coreVersion `string`

Version of DatastoreCore that is in use. This will be compiled into the Datastore.

### functions `{ [name:string]: Function}`

Object containing [Functions](./function.md) keyed by their name.

### crawlers `{ [name:string]: Crawler}`

Object containing [Crawlers](./function.md) keyed by their name.

### remoteDatastores `{ [name]: url }` {#remote-datastores}

Object containing an optional key/value of remoteDatastore "names" to urls of the remoteDatastore used as part of [PassthroughFunctions](./passthrough-function.md). Urls take the format `ulx://<MinerHost>/<DatastoreVersionHash>`.

## Methods

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
await client.exec(version, 'functionName', { authentication });
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
- signature `Buffer`. A valid Ed25519 signature providing proof of the Identity private key. The signature message is a sha3 of `Datastore.exec` + any `GiftCard Id` + any `Micronote Id` + the included `nonce`.
- nonce `string`. A unique nonce code. This nonce can be used for additional "unique" calls validation if desired.

### crawl _ (crawlerName, input)_ {#crawl}

Execute a crawler and return the resulting crawler metadata. Options can include `input` parameters defined in the schema.

#### Return Promise<ICrawlerOutputSchema>. Returns a promise of the crawler output (version, sessionId and crawler).

### stream _ (functionName, input)_ {#stream}

Execute a function and stream results. Options can include `input` parameters defined in the schema.

#### Return AsyncIterable | Promise<schema['output']>. Returns a promise of the defined schema values, which can be waited for as one result at a time.
