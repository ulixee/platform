# DataboxSchema

> DataboxSchemas provide a way to add Typescript types, validation and documentation for the Input and Output of a Databox.

DataboxSchemas are not a runtime class, but an interface of a few properties to define the Databox Input/Output structure. When you define the input and output of a Databox, a few things happen:

- Typescript types will be generated and input/output will emit compilation errors
- Runtime validation is performed when parsing input parameters or returning results
- Realtime validation occurs as you add output properties. If a type is wrong, your script will halt and notify you immediately so you don't waste any extra work.

```js
import Databox from '@ulixee/databox-for-hero';
import { string } from '@ulixee/schema';

export default new Databox({
  async run(databox) {
    const { input, output, hero } = databox;

    await hero.goto(input.url);
    const title = await hero.document.title;

    output.title = title;
    output.resolvedUrl = await hero.url;
    // ERROR: body expects a string, not a Promise<string>!
    output.body = hero.document.body.textContent;
  },
  // DataboxSchema definition
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
});
```

When you package a `Databox` for [deployment](/docs/databox/overview/deployment), a few other type utilities are added:

- Types are automatically created so that you can import Databox types.

  ```bash
  npx @ulixee/databox deploy ./index.js; // Databox Version hash is dbx12343
  ```

  ```js
  import ITypes from '@ulixee/databox/types';

  type IIndexDataboxSchema = ITypes['dbx12343'];
  ```

- Typing of parameters and results are automatically referenced when running a Databox.
  ```js
  import DataboxClient from '@ulixee/databox/lib/DataboxApiClient';
  const client = new DataboxClient('localhost:8080');
  const result = client.exec('dbx12343', { url: 'https://ulixee.org ' });
  // result has type inferred automatically.
  ```

- Consumers of your `Databox` can `install` your `DataboxVersionHash` and the accompanying types using `@ulixee/databox install <DataboxVersionHash>`.

## Documentation Generation

TODO: This feature will come in a follow-on release, and will auto-generate a website with documentation for using a Databox. Details come from this DataboxSchema definition.

## Properties

### name `string`

Optional name to label this DataboxSchema in Documentation.

### description `string`

Optional longer form description to describe the usage or details of this DataboxSchema in Documentation.

### icon `string`

Optional icon name to use in the auto-generated website documentation. NOTE: This feature is not yet in use in Ulixee 2.0.

### input `Record<string, Any Schema>` {#input}

Optional input fields definition containing and object of string Keys to [Schema](/docs/databox/databox-advanced/schema) values.

### output `Record<string, Any Schema>` | ObjectSchema | ArraySchema

Optional definition of Key/[Any Schema](/docs/databox/databox-advanced/schema), [Object](/docs/databox/databox-advanced/schema#object) or [Array](/docs/databox/databox-advanced/schema#array) to be returned.

### inputExamples: `Record<string, Example Value or DataUtilities Function>[]`

Optional array of example input field combinations. Each record contains an object of [input](#input) keys mapped to a value of the provided Schema type. There are in-built Data functions to generate dynamic data that are included with the `@ulixee/schema` library. Functions importable are:

- `dateAdd(quantity: number, units: IUnits)`: Add to the current date. Units options are `'seconds' | 'minutes' | 'hours' | 'days' | 'months' | 'years'`.
- `dateSubtract(quantity: number, units: IUnits)`: Subtract from the current date. Units options are `'seconds' | 'minutes' | 'hours' | 'days' | 'months' | 'years'`.

```js
import Databox from '@ulixee/databox-for-hero';
import { string, dateAdd } from '@ulixee/schema';

export default new Databox({
  async run(databox) {
    const { input, output, hero } = databox;
  },
  schema: {
    input: {
      when: string({ format: 'date' }),
    },
    inputExamples: [{ when: (1, 'days') }],
  },
});
```
