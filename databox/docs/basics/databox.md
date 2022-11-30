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

A Databox is constructed with one or more [Functions](/docs/databox/basics/function).

## Constructor

### new Databox _(databoxComponents)_ {#constructor}

Creates a new Databox instance.

#### **Arguments**:

- functions: `object`. An object mapping names to [Functions](/docs/databox/basics/function).
  - key `string`. A unique name of the function.
  - value `Function`. A [Function](/docs/databox/basics/function) instance.

```js
import Databox from '@ulixee/databox';

export default new Databox({
  functions: {
    instance: new Function({
      run({ input, output }) {
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

Object containing [Functions](/docs/databox/basics/function) keyed by their name.

## Methods

There are no public methods on this instance.
