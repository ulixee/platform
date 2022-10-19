# Databox

> Databoxes are self-contained data extraction scripts defined so they can be configured many ways and re-run many times.

Each databox takes in Input provided by tooling or a CLI, performs an extraction and returns Output. 

The default format for a Databox is to export a default object that provides a single callback with your logic. Your callback will be supplied with [input](#input) parameters and an [output](#output) object to assemble your collected data.

```js
import Databox from '@ulixee/databox-playground';

export default new Databox(databox => {
  databox.output = `Hello ${databox.input.firstName}`;
});
```

If you directly execute a javascript/typescript file from the command and that file contains a default Databox export (like the scripts listed above), the databox's [run()](#run) function will automatially be invoked. You can disable this autorun feature by setting the environment variable `ULX_DATABOX_DISABLE_AUTORUN` to `true`.

## Constructor

### new Databox<InputType,OutputType>_(function | databoxComponents)_ {#constructor}

Creates a new Databox instance. 

A databox can be constructed with a generic type argument to type (in Typescript) the Input and Output parameters passed into your callback function(s).

#### **Arguments**:

Arguments can be a single callback function matching the `run` callback below, or an object containing the following properties.

- run `function`(runner: [Runner](/docs/databox-basics/runner-object)): `Promise<any>`. A function that contains your script to run. The parameter is a [DataboxObject](/docs/databox/databox-basics/runner-object) that provides access to [input](/docs/databox//advanced-client/runner#input) and [output](/docs/databox/advanced-client/runner#output)
- defaults `object`. Optional. Default settings to provide.
  - input `object`. Default input values to use.
  - output `object`. Optionally construct a default output object - for instance, to initialize a results array.
- plugins `Array<Plugin>`. Optional. A list of plugin classes.

## Methods

There are no public methods on the Databox instance. The databox is automatically executed when you run the file as a normal node script.
