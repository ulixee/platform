# Databox

> Databoxes are self-contained data extraction scripts defined so they can be configured many ways and re-run many times.

The default format for a Databox is to export a default object that provides a single callback with your logic. Your callback will be supplied with [input](#input) parameters, an [output](#output) object to assemble your collected data, and a [Hero](/docs/hero) object to interact with the web.

```js
import Databox from '@ulixee/databox-for-hero-playground';

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
import Databox from '@ulixee/databox-for-hero-playground';

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

Databoxes also provide a way to simplify data extraction once you have collected [DOM Elements](/docs/databox/advanced-client/collected-elements), [Resources](/docs/databox/advanced-client/collected-resources) and [Snippets](/docs/databox/advanced-client/collected-snippets) you need to harvest.

```js
import Databox from '@ulixee/databox-for-hero-playground';

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

If you directly execute a javascript/typescript file from the command and that file contains a default Databox export (like the scripts listed above), the databox's [run()](#run) function will automatially be invoked. You can disable this autorun feature by setting the environment variable `ULX_DATABOX_DISABLE_AUTORUN` to `true`.

## Constructor

### new Databox<InputType,OutputType>_(function | databoxComponents)_ {#constructor}

Creates a new Databox instance. 

A databox can be constructed with a generic type argument to type (in Typescript) the Input and Output parameters passed into your callback function(s).

#### **Arguments**:

Arguments can be a single callback function matching the `run` callback below, or an object containing the following properties.

- run: `function`(runner: [Runner](/docs/databox/runner)): `Promise<any>`. A function that contains your Hero script to run (and optionally extract your data). The parameter is a [Runner](/docs/databox/advanced-client/runner) that provides access to a [Hero](/docs/hero) instance, [input](/docs/databox//advanced-client/runner#input) and [output](/docs/databox/advanced-client/runner#output)
- extract: `function`(extractor: [Extractor](/docs/databox/advanced-client/extractor)): `Promise<any>`. An optional function that transforms collected assets into your desired output structure. [Extractors](/docs/databox/advanced-client/extractor) can be beneficial to separate because they can run on the collected assets from a previous run, so can complete execution very quickly. Find more details [here](/docs/databox/advanced-client/extractor).
- defaults `object`. Optional default settings to provide.
  - input `object`. Default input values to use.
  - hero [`IHeroCreateOptions`](/docs/hero/basic-client/hero#constructor). Configure Hero with any default options
  - output `object`. Optionally construct a default output object - for instance, to initialize a results array.

## Methods

There are no public methods on the Databox instance. The databox is automatically executed when you run the file as a normal node script.
