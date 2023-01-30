# Runner

This is the primary class used to create a datastore Runner. The following is a simple example:

```js
import { Runner } from '@ulixee/datastore';

export default new Runner(context => {
  context.Output.emit({ name: `Hello ${context.input.firstName}` });
});
```

Saving the above code to a file allows you to execute it directly from the command line as a normal node script:

```bash
node example.js --input.firstName=Caleb
```

The callback method supplied to Runner's constructor receives a [RunnerContext](./runner-context.md) as its first argument. This includes special [input](./input.md) and [Output](./output.md) objects.

### Plugins

A datastore Runner has a `run` callback where all your logic goes. The supplied arguments can be enhanced with [Plugins](../advanced/plugins.md) and several are included out of hte box (eg, HeroRunnerPlugin adds a Hero and HeroReplay constructor to the callbacks).

```js
import { Runner } from '@ulixee/datastore';
import { HeroRunnerPlugin } from '@ulixee/datastore-plugins-hero';

export default new Runner(
  {
    run(ctx) {
      const hero = new ctx.Hero();
      ctx.Output.emit({ name: `Hello ${ctx.input.firstName}` });
    },
  },
  HeroRunnerPlugin,
);
```

## Constructor

### new Runner _(function | functionComponents, ...plugins[])_ {#constructor}

Creates a new Runner instance.

#### **Arguments**:

The first argument can be a single callback function matching the `run` callback below, or an object containing the following properties.

- run `function`(context: [RunnerContext](./runner-context.md)): `Promise<schema['output]>`. A function that contains your script to run. The parameter is a [RunnerContext](./runner-context.md) that provides access to [Input](./input.md) and [Output](./output.md)
- schema `IRunnerSchema`. Optional [schema](../advanced/runner-schemas.md) defining the type-checked input and output parameters for the function.
- minimumPrice `number`. Optional minimum price that must be allocated in a Micronote for a caller.
- pricePerQuery `number`. Optional charge price per query.
- addOnPricing `object`. Optional pricing add-ons if your output varies widely in the amount of data that can be sent. This currently accepts a single property:
  - perKb `number`. A price per Kilobyte of data output.
- name `string`. Optional name for this function, primarily used only if defining a Runner outside a Datastore.

The second argument is a list of zero or more plugins.

- plugins `Array<Plugin>`. Optional. A list of [plugin-compatible classes](../advanced/plugins).

## Methods

### runInternal _ (options)_ {#stream}

Run the Runner and get the resulting Outputs. The result is an AsyncIterable, so can be used to get each Output record as it is emitted. Alternatively, if you await the result, it will wait for the process to complete and return all Output records as an array. Parameter options are the `input` schema, or any values if none is defined.

NOTE: this function is labeled "internal" because no context will be supplied to function from the calling context. If, for instance, you call this Runner from inside another Runner, you will lose payment, authentication, affiliateId, etc unless you explicitly provide them.

#### Return Promise/AsyncIterable of schema['Output'] Returns an AsyncIterable streaming results one at a time, or a Promise waiting for all results. The objects are the defined Schema Output records.
