# Databox

> Databoxes are self-contained data extraction scripts defined so they can be configured many ways and re-run many times.

The default format for a Databox is to export a default object that provides a single callback with your logic. Your callback will be supplied with [input](#input) parameters, an [output](#output) object to assemble your collected data, and a [Hero](/docs/hero) object to interact with the web.

```js
import Databox from '@ulixee/databox';

export default new Databox(async databox => {
  const { hero, input, output } = databox;
  await hero.goto('https://dataliberationfoundation.org');
  const titles = await hero.querySelectorAll('h1,h2,h3,h4,h5');
  for (const title of titles) {
    output.titles[title.tagName] ??= [];
    output.titles[title.tagName].push(title.textContent);
  }
});
```

Databoxes automatically provision a [Hero](/docs/hero) instance. You can configure it using Databox defaults.

```js
import Databox from '@ulixee/databox';

export default new Databox({
  defaults: {
    hero: {
      locale: 'en-GB,en',
    },
    input: {
      url: 'https://dataliberationfoundation.org',
    },
  },
  async run(databox) {
    const { hero, input } = databox;
    await hero.goto(input.url);
    // expect en-GB
    const locale = await hero.getJsValue('navigator.language');
  },
});
```

Databoxes also provide a way to simplify data extraction once you have collected [DOM Elements](/docs/databox/advanced/collected-elements), [Resources](/docs/databox/advanced/collected-resources) and [Snippets](/docs/databox/advanced/collected-snippets) you need to harvest.

```js
import Databox from '@ulixee/databox';

export default new Databox({
  async run(databox) {
    const { hero } = databox;
    const pageLoad = await hero.goto('https://ulixee.org');

    await pageLoad.$extractLater('Document');

    await hero.querySelector('h1').$extractLater('h1');
  },
  async extract(extractor) {
    const { collectedElements, collectedResources, output } = extractor;
    const doc = await collectedResources.get('Document');
    const bytes = Buffer.byteLength(doc.buffer);
    output.documentBytes = bytes;

    const h1 = await collectedElements.get('h1');
    output.title = h1.textContent;
  },
});
```

## Constructor

### new Databox<InputType,OutputType>_(function | databoxComponents)_ {#constructor}

Creates a new Databox instance. If the environment variable `DATABOX_RUN_LATER` is truthy, this function will not run immediately, but wait for the [run()](#run) function to be invoked.

A databox can be constructed with a generic type argument to type (in Typescript) the Input and Output parameters passed into your callback function(s).

#### **Arguments**:

Arguments can be a single callback function matching the `run` callback below, or an object containing the following properties.

- run: `function`(runner: [Runner](/docs/databox/runner)): `Promise<any>`. A function that contains your Hero script to run (and optionally extract your data). The parameter is a [Runner](/docs/databox/basic-interfaces/runner) that provides access to a [Hero](/docs/hero) instance, [input](/docs/databox//basic-interfaces/runner#input) and [output](/docs/databox/basic-interfaces/runner#output)
- extract: `function`(extractor: [Extractor](/docs/databox/basic-interfaces/extractor)): `Promise<any>`. An optional function that transforms collected assets into your desired output structure. [Extractors](/docs/databox/basic-interfaces/extractor) can be beneficial to separate because they can run on the collected assets from a previous run, so can complete execution very quickly. Find more details [here](/docs/databox/basic-interfaces/extractor).
- defaults `object`. Optional default settings to provide.
  - input `object`. Default input values to use.
  - hero [`IHeroCreateOptions`](/docs/hero/basic-interfaces/hero#constructor). Configure Hero with any default options
  - output `object`. Optionally construct a default output object - for instance, to initialize a results array.

## Methods

### databox.run*(options)* {#run}

Run the Databox function. The provided options will be used to configure the created [Hero](/docs/hero) instance and will supply `input` parameters to the `run` function.

This function does not need to be called directly to run your script. You can simply run the script as a normal node script.

NOTE: if the environment variable `DATABOX_RUN_LATER` is not truthy, creating a Databox will trigger this function to run.

#### **Arguments**:

- options `object`. The configuration options to create a [`Hero`](/docs/hero/basic-interfaces/hero#constructor) instance and Databox configurations (`input`).

#### **Returns**: `Promise<OutputType>`. Returns the output created by the script.
