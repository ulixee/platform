# Changes to DataboxObject

Databox for Hero modifies the standard Databox constructor object by adding an extra optional callback.

## Constructor

### new DataboxForHero<InputType,OutputType>_(function | databoxComponents)_ {#constructor}

The only difference 

#### **Arguments**:

Arguments can be a single callback function matching the `run` callback below, or an object containing the following properties.

- run: `function`(databoxObject: [DataboxObject](/docs/hero/databox-for-hero/changes-to-databox-object)): `Promise<any>`. A function that contains your Hero script to run (and optionally extract your data).
- onAfterHeroCompletes: `function`(databoxObject: [DataboxObject](/docs/hero/databox-for-hero/changes-to-databox-object)): `Promise<any>`. An optional function that transforms collected assets into your desired output structure. [Extractors](/docs/databox/advanced-client/extractor) can be beneficial to separate because they can run on the collected assets from a previous run, so can complete execution very quickly. Find more details [here](/docs/databox/advanced-client/extractor).
- defaults `object`. Optional default settings to provide.
  - input `object`. Default input values to use.
  - hero [`IHeroCreateOptions`](/docs/hero/basic-client/hero#constructor). Configure Hero with any default options
  - output `object`. Optionally construct a default output object - for instance, to initialize a results array.

