# Using the DataboxForHero Plugin

> DataboxForHero supercharges your databox with full Hero capabilities. It also allow you to organize your script into two executation stages - the standard `run` callback and a second `onAfterHeroCompletes` callback.

To use DataboxForHero, import the plugin and include it in the `plugins` array of your Databox constructor:

```js
import Databox from '@ulixee/databox';
import { DataboxForHeroPlugin } = '@ulixee/databox-for-hero';

export default new Databox({
  plugins: [DataboxForHeroPlugin],
  async run(databox) {
    const { input, output, hero } = databox;
    // use hero however you want
  },
});
```

A simpler approach is use the DataboxForHero's default export, which automatically bundles the plugin. You can use it almost exactly the same as the standard Databox:

```js
import DataboxForHero = '@ulixee/databox-for-hero';

export default new DataboxForHero(async databox => {
  const { input, output, hero } = databox;
  // use hero however you want
});
```

DataboxForHero automatically cleans up and closes the hero instance at the completion of each databox run.

## Utilizing Two-Part Extraction

DataboxForHero adds a `onAfterHeroCompletes()` callback that you can use after the `run()` callback to create a two-step extraction process. Here's how it works.

You can use [Hero](/docs/hero/basic-client/hero) in the `run()` step to interact with a website and collect assets like [Resources](/docs/databox/advanced-client/detached-resources), [HTML Fragments](/docs/databox/advanced-client/detached-elements) and [Data Snippets](/docs/databox/advanced-client/collected-snippets) that can be used later.

The `onAfterHeroCompletes()` callback step has access to [HeroReplay](/docs/hero/basic-client/hero-replay) and therefore all the DetachedElments and DetachedResources that have been collected. This allows you to pull data from a synchronous set of assets (ie, you don't have to run your logic browser-side). It also allows you to run your extraction logic as a unit, which enables you to keep running it on assets collected from your last `run` until your logic works correctly. 

```js
import Databox from '@ulixee/databox-for-hero-playground';

export default new Databox({
  async run(databox) {
    const { hero } = databox;
    await hero.goto('https://ulixee.org');
    await document.querySelector('h1').$addToDetachedElements('h1');
    await hero.markTimelineAs('test');
  },
  async onAfterHeroCompletes(databox) {
    const { input, output, heroReplay } = databox;
    const document = await heroReplay.goToTimeline('test');

    await document.$getResource();
    const bytes = Buffer.byteLength(await document.buffer);
    output.documentBytes = bytes;

    const h1 = await hero.detachedElements.get('h1');

    const h1 = await document.querySelector('h1').$detach();
    output.title = h1.textContent;
  },
});
```


## Passing In Hero-Specific Configuration

You can configure the supplied [Hero](/docs/hero) instance through the defaults object:

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