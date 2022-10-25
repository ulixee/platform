# Databox

This is the primary class used to create a databox. The following is a simple example:

```js
import Databox from '@ulixee/databox-playground';

export default new Databox(databoxObject => {
  databoxObject.output = `Hello ${databoxObject.input.firstName}`;
});
```

Saving the above code to a file allows you to execute it directly from the command line as a normal node script:

```bash
node example.ts --input.firstName=Caleb
```

The callback method supplied to Databox's constructor recieves a [DataboxObject](/docs/databox/databox-basics/databox-object) as its first argument. This includes special [input](/docs/databox/databox-basics/input-object) and [output](/docs/databox/databox-basics/output-object) objects.

## Constructor

### new Databox _(function | databoxComponents)_ {#constructor}

Creates a new Databox instance. 

#### **Arguments**:

Arguments can be a single callback function matching the `run` callback below, or an object containing the following properties.

- run `function`(runner: [Runner](/docs/databox-basics/runner-object)): `Promise<any>`. A function that contains your script to run. The parameter is a [DataboxObject](/docs/databox/databox-basics/runner-object) that provides access to [InputObject](/docs/databox/databox-basics/input-object) and [OutputObject](/docs/databox/databox-basics/output-object)
- defaults `object`. Optional. Default settings to provide.
  - input `object`. Default input values to use.
  - output `object`. Optionally construct a default output object - for instance, to initialize a results array.
- plugins `Array<Plugin>`. Optional. A list of [plugin-compatible classes](/docs/databox/databox-basics/plugins).

## Methods

There are no public methods on this instance.
