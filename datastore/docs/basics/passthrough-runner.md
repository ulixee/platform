# Passthrough Runner

A PassthroughRunner allows you to extend other Datastore Runners published across the web. Passthrough Runners don't have their own `run` callback - it has been delegated to the remote function. Input and Output can be manipulated before data is sent to the remote function using the `onRequest` callback, or afterwards in the `onResponse` function.

### An Example

The following is a simple example:

##### Runner 1 Published to a Miner at `153.23.22.255:8080`:

```js
import Datastore, { Runner } from '@ulixee/datastore';

export default new Datastore({
  runners: {
    function1: new Runner({
      run({ input, Output }) {
        const output = new Output();
        output.didRun = true;
        output.echo = input.toEcho;
      },
    }),
  },
});
```

##### Runner 2:

```js
import Datastore, { PassthroughRunner } from '@ulixee/datastore';

export default new Datastore({
  // NOTE: this is not a real hosted Datastore
  remoteDatastores: {
    source: `ulx://153.23.22.255:8080/dbx1tn43ect3qkwg0patvq`,
  },
  runners: {
    function2: new PassthroughRunner({
      remoteRunner: `source.function1`,
      async onResponse({ Output, stream }) {
        const [record] = await stream;
        Output.emit({ ...record, didPasshthrough: true });
      },
    }),
  },
});
```

##### Running:

Saving the above code to a file allows you to execute it directly from the command line as a normal node script:

```bash
node example.js --input.toEcho=hi
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

### new PassthroughRunner _(functionComponents, ...plugins[])_ {#constructor}

Creates a new PassthroughRunner instance.

#### **Arguments**:

functionComponents `object`:

- remoteRunner `string`. Required remoteRunner to run. This string must start with the name of the `remoteDatastores` key as defined in [Datastore.remoteDatastores](./datastore.md#remote-datastores).
- upcharge `number`. Optional microgons to add to the PassthroughRunner pricing. Defaults to 0.
- onRequest `function`(context: [RunnerContext](./function-context.md)): `Promise<any>`. Optional function that contains any logic you wish to perform "before" the `remote` Runner is called. This allows you to modify input, or enhance information using a Hero browser (if a plugin is used).
- onResponse `function`(context: [RunnerContext](./function-context.md)): `Promise<any>`. Optional function that contains any logic you wish to perform "after" the `remote` Runner has been called. The context includes:
  - stream `ResultsIterable`. An AsyncIterable object that can resolve each Output as it is emitted, or simply await the final result.
- schema `IRunnerSchema`. Optional [schema](../advanced/function-schemas.md) defining the type-checked input and output parameters for the function. This schema can be different than the remote function if conversion or manipulation will be performed on the underlying data.

The second argument is a list of zero or more plugins.

- plugins `Array<Plugin>`. Optional. A list of [plugin-compatible classes](../advanced/plugins).

## Methods

### stream _ (options)_ {#stream}

Execute the function. Options can include `input` parameters defined in the schema.

#### Return AsyncIterable | Promise<schema['output']>. Returns a promise of the defined schema values, which can be waited for as one result at a time.

```js
import DatastoreApiClient  from '@ulixee/datastore/lib/DatastoreApiClient';

const client = new DatastoreApiClient('153.23.22.255:8080');

const stream = client.stream('function2', {});

// Async Iterable
for await (const result of stream) {
  console.log('Emitted result', result);  
}

// Or Promise
const allResults = await stream.results;
```
