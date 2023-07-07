# Passthrough Extractor

A PassthroughExtractor allows you to extend other Datastore Extractors published across the web. Passthrough Extractors don't have their own `run` callback - it has been delegated to the remote function. Input and Output can be manipulated before data is sent to the remote function using the `onRequest` callback, or afterwards in the `onResponse` function.

### An Example

The following is a simple example:

#### Extractor 1 Published to a CloudNode at `153.23.22.255:8080`:

```js
import Datastore, { Extractor } from '@ulixee/datastore';

export default new Datastore({
  id: `echo`,
  version: '0.0.1',
  extractors: {
    extractor1: new Extractor({
      run({ input, Output }) {
        const output = new Output();
        output.didRun = true;
        output.echo = input.toEcho;
      },
    }),
  },
});
```

#### Extractor 2:

```js
import Datastore, { PassthroughExtractor } from '@ulixee/datastore';

export default new Datastore({
  id: 'echo2',
  version: '0.0.1',
  // NOTE: this is not a real hosted Datastore
  remoteDatastores: {
    source: `ulx://153.23.22.255:8080/echo@v0.0.1`,
  },
  extractors: {
    extractor2: new PassthroughExtractor({
      remoteExtractor: `source.extractor1`,
      async onResponse({ Output, stream }) {
        const [record] = await stream;
        Output.emit({ ...record, didPasshthrough: true });
      },
    }),
  },
});
```

#### Running:

Start your datastore.
```bash
npx @ulixee/datastore start ./example.js
```

Now you can query your Datastore with [Ulixee Client](https://ulixee.org/docs/client).

```bash
import Client from '@ulixee/client';

const client = new Client('ulx://localhost:1818/echo2@0.0.1');
client.fetch('extractor2', { toEcho: 'hi' }).then(records => {
  console.log(records);
});
```


The output will be:

```json
{
  "didRun": true,
  "echo": "hi",
  "didPasshtrough": true
}
```

## Constructor

### new PassthroughExtractor _(extractorComponents, ...plugins[])_ {#constructor}

Creates a new PassthroughExtractor instance.

#### **Arguments**:

extractorComponents `object`:

- remoteExtractor `string`. Required remoteExtractor to run. This string must start with the name of the `remoteDatastores` key as defined in [Datastore.remoteDatastores](./datastore.md#remote-datastores). Eg, `source.extractor1`, where `extractor1` is the extractor name, and `source` is a key of `remoteDatastores`. 
- upcharge `number`. Optional microgons to add to the PassthroughExtractor pricing. Defaults to 0.
- onRequest `function`(context: [ExtractorContext](./extractor-context.md)): `Promise<any>`. Optional function that contains any logic you wish to perform "before" the `remote` Extractor is called. This allows you to modify input, or enhance information using a Hero browser (if a plugin is used).
- onResponse `function`(context: [ExtractorContext](./extractor-context.md)): `Promise<any>`. Optional function that contains any logic you wish to perform "after" the `remote` Extractor has been called. The context includes:
  - stream `ResultsIterable`. An AsyncIterable object that can resolve each Output as it is emitted, or simply await the final result.
- schema `IExtractorSchema`. Optional [schema](../advanced/extractor-schemas.md) defining the type-checked input and output parameters for the function. This schema can be different than the remote function if conversion or manipulation will be performed on the underlying data.

The second argument is a list of zero or more plugins.

- plugins `Array<Plugin>`. Optional. A list of [plugin-compatible classes](../advanced/plugins).
