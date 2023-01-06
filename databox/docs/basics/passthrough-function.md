# Passthrough Function

A PassthroughFunction allows you to extend other Databox Functions published across the web. Passthrough Functions don't have their own `run` callback - it has been delegated to the remote function. Input and Output can be manipulated before data is sent to the remote function using the `onRequest` callback, or afterwards in the `onResponse` function.

### An Example

The following is a simple example:

##### Function 1 Published to a Miner at `153.23.22.255:8080`:

```js
import Databox, { Function } from '@ulixee/databox';

export default new Databox({
  functions: {
    function1: new Function({
      run({ input, Output }) {
        const output = new Output();
        output.didRun = true;
        output.echo = input.toEcho;
      },
    }),
  },
});
```

##### Function 2:

```js
import Databox, { PassthroughFunction } from '@ulixee/databox';

export default new Databox({
  // NOTE: this is not a real hosted Databox
  remoteDataboxes: {
    source: `ulx://153.23.22.255:8080/dbx1tn43ect3qkwg0patvq9jev54s36kujv0szfrjqdh3uuuufrk2vvq40gg3x`,
  },
  functions: {
    function2: new PassthroughFunction({
      remoteFunction: `source.function1`,
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

### new PassthroughFunction _(functionComponents, ...plugins[])_ {#constructor}

Creates a new PassthroughFunction instance.

#### **Arguments**:

functionComponents `object`:

- remoteFunction `string`. Required remoteFunction to run. This string must start with the name of the `remoteDataboxes` key as defined in [Databox.remoteDataboxes](./databox.md#remote-databoxes).
- upcharge `number`. Optional microgons to add to the PassthroughFunction pricing. Defaults to 0.
- onRequest `function`(context: [FunctionContext](./function-context.md)): `Promise<any>`. Optional function that contains any logic you wish to perform "before" the `remote` Function is called. This allows you to modify input, or enhance information using a Hero browser (if a plugin is used).
- onResponse `function`(context: [FunctionContext](./function-context.md)): `Promise<any>`. Optional function that contains any logic you wish to perform "after" the `remote` Function has been called. The context includes:
  - stream `ResultsIterable`. An AsyncIterable object that can resolve each Output as it is emitted, or simply await the final result.
- schema `IFunctionSchema`. Optional [schema](../advanced/function-schemas.md) defining the type-checked input and output parameters for the function. This schema can be different than the remote function if conversion or manipulation will be performed on the underlying data.

The second argument is a list of zero or more plugins.

- plugins `Array<Plugin>`. Optional. A list of [plugin-compatible classes](../advanced/plugins).

## Methods

### stream _ (options)_ {#stream}

Execute the function. Options can include `input` parameters defined in the schema.

#### Return AsyncIterable | Promise<schema['output']>. Returns a promise of the defined schema values, which can be waited for as one result at a time.

```js
import DataboxApiClient  from '@ulixee/databox/lib/DataboxApiClient';

const client = new DataboxApiClient('153.23.22.255:8080');

const stream = client.stream('function2', {});

// Async Iterable
for await (const result of stream) {
  console.log('Emitted result', result);  
}

// Or Promise
const allResults = await stream.results;
```
