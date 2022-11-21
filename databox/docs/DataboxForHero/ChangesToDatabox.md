# Changes to DataboxObject

Databox for Hero makes a slight modification to the standard Databox constructor object.

## Constructor

### new DataboxForHero _(function | databoxComponents)_ {#constructor}

You construct a DataboxForHero instance exactly the same as Databox. The only difference is DataboxForHero allows for two extra optional objects: an `onAfterHeroCompletes` callback and a `hero` default.

#### **Arguments**:

Arguments can be a single callback function matching the `run` callback below, or an object containing the following properties.

- run: `function`(databoxObject: [DataboxObject](/docs/databox/databox-plugins-hero/changes-to-databox-object)): `Promise<any>`. A function that contains your Hero script to run (and optionally extract your data).
- onAfterHeroCompletes: `function`(databoxObject: [DataboxObject](/docs/databox/databox-plugins-hero/changes-to-databox-object)): `Promise<any>`. An optional function that transforms collected assets into your desired output structure. The only difference between this callback and `run` is that the DataboxObject supplies a `heroReplay` instance instead of `hero`.
- defaults `object`. Optional default settings to provide.
  - input `object`. Default input values to use.
  - hero [`IHeroCreateOptions`](/docs/hero/basic-client/hero#constructor). Configure Hero with any default options
  - output `object`. Optionally construct a default output object - for instance, to initialize a results array.

