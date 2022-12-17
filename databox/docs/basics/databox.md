# Databox

This is the primary class used to create a databox. The following is a simple example:

```js
import Databox from '@ulixee/databox';

export default new Databox({
  functions: {
    nameOfFunction: new Function(functionContext => {
      functionContext.output = `Hello ${functionContext.input.firstName}`;
    }),
  },
});
```

A Databox is constructed with one or more [Functions](./function.md).

## Constructor

### new Databox _(databoxComponents)_ {#constructor}

Creates a new Databox instance.

#### **Arguments**:

- functions: `object`. An object mapping names to [Functions](./function.md).
  - key `string`. A unique name of the function.
  - value `Function`. A [Function](./function.md) instance.
- authenticateIdentity `function`. An optional function that can be used to secure access to this Databox. More details are [here](#authenticateIdentity)
- remoteDataboxes `{ [name]: url }`. An optional key/value of remoteDatabox "names" to urls of the remoteDatabox used as part of [PassthroughFunctions](./passthrough-function.md).

```js
import Databox, { Function } from '@ulixee/databox';

export default new Databox({
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

Version of DataboxCore that is in use. This will be compiled into the Databox.

### functions `{ [name:string]: Function}`

Object containing [Functions](./function.md) keyed by their name.

### remoteDataboxes `{ [name]: url }` {#remote-databoxes}

Object containing an optional key/value of remoteDatabox "names" to urls of the remoteDatabox used as part of [PassthroughFunctions](./passthrough-function.md). Urls take the format `ulx://<MinerHost>/<DataboxVersionHash>`.

## Methods

### authenticateIdentity _(identity, nonce)_ {#authenticateIdentity}

An optional callback that can be used to secure a Databox. This method can allow you to issue private Identities to remote Databox consumers and only allow those users to access your Databox. An Identity can be created using the `@ulixee/crypto` cli:

```bash
 npx @ulixee/crypto identity create
```

A caller would use the generated Identity to create an authentication message:

```js
import DataboxApiClient from '@ulixee/databox/lib/DataboxApiClient';
import Identity from '@ulixee/crypto/lib/Identity';

const identity = Identity.loadFromFile('~/databoxAuth.pem');
let payment = null; // fill in with payment if needed
// this authentication message will be passed to the Databox queries.
const authentication = DataboxApiClient.createExecAuthentication(payment, identity);
const client = new DataboxApiClient();
await client.exec(version, 'functionName', { authentication });
```

Your Databox can then only allow your distributed Identities:

```js
import Databox from '@ulixee/databox';

const whitelist = new Set([`id1xv7empyzlwuvlshs2vlf9eruf72jeesr8yxrrd3esusj75qsr6jqj6dv3p`]);

export default new Databox({
  authenticateIdentity(identity, nonce) {
    return whitelist.has(identity);
  },
});
```

The Databox Core will automatically ensure that any calling authentication messages include the following properties before passing the identity and nonce to your `authenticateIdentity` callback:

- identity `string`. A bech32 encoded Identity of the caller.
- signature `Buffer`. A valid Ed25519 signature providing proof of the Identity private key. The signature message is a sha3 of `Databox.exec` + any `GiftCard Id` + any `Micronote Id` + the included `nonce`.
- nonce `string`. A unique nonce code. This nonce can be used for additional "unique" calls validation if desired.
