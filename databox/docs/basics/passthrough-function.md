# Passthrough Function

A PassthroughFunction allows you to extend other Databox Functions published across the web. Passthrough Functions don't have their own `run` callback - it has been delegated to the remote function. Input and Output can be manipulated before data is sent to the remote function using the `beforeRun` callback, or afterwards in the `afterRun` function.

### An Example

The following is a simple example:

##### Function 1 Published to a Miner at `153.23.22.255:8080`:

```js
import Databox, { Function } from '@ulixee/databox';

export default new Databox({
  functions: {
    function1: new Function({
      run({ input, output }) {
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
  remoteDataboxes: {
    source: `ulx://153.23.22.255:8080/dbx1tn43ect3qkwg0patvq9jev54s36kujv0szfrjqdh3uuuufrk2vvq40gg3x`,
  },
  functions: {
    function2: new PassthroughFunction({
      remoteFunction: `source.function1`,
      afterRun({ output }) {
        output.didPasshthrough = true;
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

### new PassthroughFunction _(functionComponents)_ {#constructor}

Creates a new PassthroughFunction instance.

NOTE: Plugins are not currently supported.

#### **Arguments**:

functionComponents `object`:

- remoteFunction `string`. Required remoteFunction to run. This string must start with the name of the `remoteDataboxes` key as defined in [Databox.remoteDataboxes](./databox.md#remote-databoxes).
- upcharge `number`. Optional microgons to add to the PassthroughFunction pricing. Defaults to 0.
- beforeRun `function`(context: [FunctionContext](./function-context.md)): `Promise<any>`. Optional function that contains any logic you wish to perform "before" the `remote` `run` callback.
- afterRun `function`(context: [FunctionContext](./function-context.md)): `Promise<any>`. Optional function that contains any logic you wish to perform "before" the run phase.
- schema `IFunctionSchema`. Optional [schema](../advanced/function-schemas.md) defining the type-checked input and output parameters for the function. This schema can be different than the remote function if conversion or manipulation will be performed on the underlying data.

## Methods

### exec _ (options)_ {#exec}

Execute the function. Options can include `input` parameters defined in the schema.

#### Return Promise<schema['output']> Returns a promise of the defined schema values.
