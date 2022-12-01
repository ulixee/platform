# FunctionSchema

> FunctionSchemas provide a way to add Typescript types, validation and documentation for the Input and Output of a databox Function.

FunctionSchemas are not a runtime class, but an interface of a few properties to define a Databox Function's Input/Output structure. When you define the input and output of a Function, a few things happen:

- Typescript types will be generated and input/output will emit compilation errors
- Runtime validation is performed when parsing input parameters or returning results
- Realtime validation occurs as you add output properties. If a type is wrong, your script will halt and notify you immediately so you don't waste any extra work.

```js
import { Function, HeroFunctionPlugin } from '@ulixee/databox-plugins-hero';
import { string } from '@ulixee/schema';

export default new Function({
  async run(databox) {
    const { input, output, hero } = databox;

    await hero.goto(input.url);
    const title = await hero.document.title;

    output.title = title;
    output.resolvedUrl = await hero.url;
    // ERROR: body expects a string, not a Promise<string>!
    output.body = hero.document.body.textContent;
  },
  // FunctionSchema definition
  schema: {
    name: 'TitleAndHtmlPageResolver',
    input: {
      url: string({ format: 'url' }),
    },
    output: {
      title: string(),
      body: string(),
      resolvedUrl: string({ format: 'url' }),
    },
    inputExamples: [
      {
        url: 'https://example.org',
      },
      {
        url: 'https://ulixee.org',
      },
    ],
  },
}, HeroFunctionPlugin);
```

When you package a `Databox` (or a `Function` auto-wrapped into a `Databox`) for [deployment](../overview/deployment), a few other type utilities are added:

- Types are automatically created so that you can import Databox Function types.

  ```bash
  npx @ulixee/databox deploy ./index.js; // Databox Version hash is dbx12343
  ```

  ```js
  import ITypes from '@ulixee/databox/types';

  type IIndexFunctionSchema = ITypes['dbx12343']['default']; // default is the name if auto-packaged
  ```

- Typing of parameters and results are automatically referenced when running a Databox function.
  ```js
  import DataboxClient from '@ulixee/databox/lib/DataboxApiClient';
  const client = new DataboxClient('localhost:8080');
  const result = client.exec('dbx12343', 'default', { url: 'https://ulixee.org ' });
  // result has type inferred automatically.
  ```

- Consumers of your `Databox` can `install` your `DataboxVersionHash` and the accompanying types using `@ulixee/databox install <DataboxVersionHash>`.

## Documentation Generation

TODO: This feature will come in a follow-on release, and will auto-generate a website with documentation for using a Databox Function. Details come from this FunctionSchema definition.

## Properties

### name `string`

Optional name to label this FunctionSchema in Documentation.

### description `string`

Optional longer form description to describe the usage or details of this FunctionSchema in Documentation.

### icon `string`

Optional icon name to use in the auto-generated website documentation. NOTE: This feature is not yet in use in Ulixee 2.0.

### input `Record<string, Any Schema>` {#input}

Optional input fields definition containing and object of string Keys to [Schema](./schema) values.

### output `Record<string, Any Schema>` | ObjectSchema | ArraySchema

Optional definition of Key/[Any Schema](./schema), [Object](./schema#object) or [Array](./schema#array) to be returned.

### inputExamples: `Record<string, Example Value or DataUtilities Function>[]`

Optional array of example input field combinations. Each record contains an object of [input](#input) keys mapped to a value of the provided Schema type. There are in-built Data functions to generate dynamic data that are included with the `@ulixee/schema` library. Functions importable are:

- `dateAdd(quantity: number, units: IUnits)`: Add to the current date. Units options are `'seconds' | 'minutes' | 'hours' | 'days' | 'months' | 'years'`.
- `dateSubtract(quantity: number, units: IUnits)`: Subtract from the current date. Units options are `'seconds' | 'minutes' | 'hours' | 'days' | 'months' | 'years'`.

```js
import { Function, HeroFunctionPlugin } from '@ulixee/databox-plugins-hero';
import { string, dateAdd } from '@ulixee/schema';

export default new Function({
  async run(ctx) {
    const { input, output, hero } = ctx;
  },
  schema: {
    input: {
      when: string({ format: 'date' }),
    },
    inputExamples: [{ when: (1, 'days') }],
  },
}, HeroFunctionPlugin);
```
