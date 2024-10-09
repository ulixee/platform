# Extractor

This is the primary class used to create a datastore Extractor. The following is a simple example:

```js
import { Extractor } from '@ulixee/datastore';

export default new Extractor(context => {
  context.Output.emit({ name: `Hello ${context.input.firstName}` });
});
```

Saving the above code to a file allows you to execute it directly from the command line as a normal node script:

```bash
node example.js --input.firstName=Caleb
```

The callback method supplied to Extractor's constructor receives a [ExtractorContext](./extractor-context.md) as its first argument. This includes special [input](./input.md) and [Output](./output.md) objects.

### Plugins

A datastore Extractor has a `run` callback where all your logic goes. The supplied arguments can be enhanced with [Plugins](../advanced/plugins.md) and several are included out of hte box (eg, HeroExtractorPlugin adds a Hero and HeroReplay constructor to the callbacks).

```js
import { Extractor } from '@ulixee/datastore';
import { HeroExtractorPlugin } from '@ulixee/datastore-plugins-hero';

export default new Extractor(
  {
    run(ctx) {
      const hero = new ctx.Hero();
      ctx.Output.emit({ name: `Hello ${ctx.input.firstName}` });
    },
  },
  HeroExtractorPlugin,
);
```

## Constructor

### new Extractor _(function | functionComponents, ...plugins[])_ {#constructor}

Creates a new Extractor instance.

#### **Arguments**:

The first argument can be a single callback function matching the `run` callback below, or an object containing the following properties.

- run `function`(context: [ExtractorContext](./extractor-context.md)): `Promise<schema['output]>`. A function that contains your script to run. The parameter is a [ExtractorContext](./extractor-context.md) that provides access to [Input](./input.md) and [Output](./output.md)
- schema `IExtractorSchema`. Optional [schema](../advanced/extractor-schemas.md) defining the type-checked input and output parameters for the function.
- basePrice `number`. Optional price per access. It's called "base price" because a query might join multiple data entities.
- name `string`. Optional name for this function, primarily used only if defining a Extractor outside a Datastore.
- description `string`. Optional description for this function, primarily for documentation website.

The second argument is a list of zero or more plugins.

- plugins `Array<Plugin>`. Optional. A list of [plugin-compatible classes](../advanced/plugins).

## Methods

### runInternal _(options)_ {#stream}

Run the Extractor and get the resulting Outputs. The result is an AsyncIterable, so can be used to get each Output record as it is emitted. Alternatively, if you await the result, it will wait for the process to complete and return all Output records as an array. Parameter options are the `input` schema, or any values if none is defined.

NOTE: this function is labeled "internal" because no context will be supplied to function from the calling context. If, for instance, you call this Extractor from inside another Extractor, you will lose payment, authentication, affiliateId, etc unless you explicitly provide them.

#### Return Promise/AsyncIterable of schema['Output'] 
Returns an AsyncIterable streaming results one at a time, or a Promise waiting for all results. The objects are the defined Schema Output records.
