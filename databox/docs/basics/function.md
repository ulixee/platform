# Function

This is the primary class used to create a databox Function. The following is a simple example:

```js
import { Function } from '@ulixee/databox';

export default new Function(context => {
  context.output = `Hello ${context.input.firstName}`;
});
```

Saving the above code to a file allows you to execute it directly from the command line as a normal node script:

```bash
node example.js --input.firstName=Caleb
```

The callback method supplied to Function's constructor receives a [FunctionContext](/docs/databox/basics/function-context) as its first argument. This includes special [input](/docs/databox/basics/input) and [output](/docs/databox/basics/output) objects.

### Lifecycle

A databox Function has a main callback called `run`. Functions have built-in lifecycle functions that run before and after a run function.

- `beforeRun(ctx)`. A callback called before run occurs. This can be used to perform setup work needed by the `run` phase.
- `run(ctx)`. A callback that contains the main function to perform.
- `afterRun(ctx)`. A callback that will be triggered after the run occurs.

[Plugins](/docs/databox/advanced/plugins) like the Hero plugin add functionality to these phases. In the case of Hero, a HeroReplay instance will be provided to the `afterRun`.

```js
import { Function } from '@ulixee/databox';
import { HeroFunctionPlugin } from '@ulixee/databox-plugins-hero';

export default new Function({
  run(ctx) {
    ctx.output = `Hello ${ctx.input.firstName}`;
  },
  async afterRun(ctx) {
    const resource = await ctx.heroReplay.detachedResources.get('x');
    ctx.output.responceCode = resource.response.statusCode;
  }
}, HeroFunctionPlugin);
```


## Constructor

### new Function _(function | functionComponents, ...plugins[])_ {#constructor}

Creates a new Function instance.

#### **Arguments**:

The first argument can be a single callback function matching the `run` callback below, or an object containing the following properties.

- run `function`(context: [FunctionContext](/docs/databox/basics/function-context)): `Promise<schema['output]>`. A function that contains your script to run. The parameter is a [FunctionContext](/docs/databox/basics/function-context) that provides access to [Input](/docs/databox/basics/input) and [Output](/docs/databox/basics/output)
- beforeRun `function`(context: [FunctionContext](/docs/databox/basics/function-context)): `Promise<any>`. Optional function that contains any logic you wish to perform "before" the run phase.
- afterRun `function`(context: [FunctionContext](/docs/databox/basics/function-context)): `Promise<any>`. Optional function that contains any logic you wish to perform "before" the run phase.
- schema `IFunctionSchema`. Optional [schema](/docs/databox/advanced/function-schema) defining the type-checked input and output parameters for the function.

The second argument is a list of zero or more plugins.
- plugins `Array<Plugin>`. Optional. A list of [plugin-compatible classes](/docs/databox/advanced/plugins).

## Methods

### exec _ (options)_ {#exec}

Execute the function. Options can include `input` parameters defined in the schema.

#### Return Promise<schema['output']> Returns a promise of the defined schema values. 

There are no public methods on this instance.
