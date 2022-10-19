# Using the Databox for Hero Plugin

> Databox for Hero supercharges your databox with full Hero capabilities.  allow you further break down your script into a "run" section and an "extract" section. 

The 'run' step can be used with [Hero](/docs/hero) to interact with a website and collect assets like [Resources](/docs/databox/advanced-client/collected-resources), [HTML Fragments](/docs/databox/advanced-client/collected-fragmes) and [Data Snippets](/docs/databox/advanced-client/collected-snippets) that can be extracted later. 

The 'extract' function is passed in collected assets, but no Hero. You can use this function to pull out data from a synchronous set of assets (ie, you don't have to run your logic browser-side). It also allows you to run your extraction logic as a unit, which enables you to keep running it on assets collected from your last `run` until your logic works correctly. 

Getting Started

Writing a Databox is very similar to writing a normal Hero script, except it must be contained within a callback, and you have make it the default export.

You can run this script as a regular node script and it will run the callback. However, this structure also allows us to load it into a server and run it on demand.

```js
export default new Databox(async databox => {
  const { input, output, hero } = databox;

  await hero.goto(input.url);
  const title = await hero.document.title;

  output.title = title;
  output.body = await hero.document.body.textContent;
  await hero.close();
});
```


A [Hero](/docs/hero) instance is automatically instantiated and passed into your function. 
a [Hero](/docs/hero) object to interact with the web.

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

Databoxes also provide a way to simplify data extraction once you have collected [DOM Elements](/docs/databox/advanced-client/detached-elements), [Resources](/docs/databox/advanced-client/collected-resources) and [Snippets](/docs/databox/advanced-client/collected-snippets) you need to harvest.

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
    const { detachedElements, detachedResources, output } = extractor;
    const doc = await detachedResources.get('Document');
    const bytes = Buffer.byteLength(doc.buffer);
    output.documentBytes = bytes;

    const h1 = await detachedElements.get('h1');
    output.title = h1.textContent;
  },
});
```

DataboxForHero automatically cleans up and closes the hero instance at the completion of each databox run.