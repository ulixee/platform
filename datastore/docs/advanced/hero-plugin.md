# HeroFunctionPlugin

> HeroFunctionPlugin supercharges your datastore Function with full Hero capabilities. It also allow you to organize your script into two execution stages - the "live" Crawler Function and a second Function operating on the cacheable Crawler output.

Datastore Functions with HeroFunctionPlugin allow you break down a script into a "live" Crawler Function and a second "offline" Function operating on the cacheable Crawler output.

The HeroFunctionPlugin adds two options to a Function's `run` callback:

- A [Hero](https://ulixee.org/docs/hero) constructor to interact with a website. The constructor will automatically connect to the local Hero Core. You can collect all output in this phase, or you can choose to detach assets like [Resources](https://ulixee.org/docs/hero/docs/hero/advanced-client/detached-resources), [HTML Elements](https://ulixee.org/docs/hero/docs/hero/advanced-client/detached-elements) and [Data Snippets](https://ulixee.org/docs/hero/basic-client/hero-replay#getSnippet) that can be extracted later.
- A [HeroReplay](https://ulixee.org/docs/hero/docs/hero/basics-client/hero-replay) constructor that can be supplied with the sessionId of a previous Hero run. A constructed instance will automatically connect to the local Hero Core. You can use this class to pull out data from your [Detached assets](https://ulixee.org/docs/hero/docs/hero/basics-client/hero-replay) (ie, you don't have to run your logic browser-side). It also allows you to run your extraction logic as a unit, which enables you to re-run it on assets collected from your Crawler until your logic works correctly.

## Getting Started

Writing a Hero script with a Datastore Function is very similar to writing a normal Hero script, except it must be contained within a callback, and you have make it the default export.

You can run this script as a regular node script and it will run the callback. However, this structure also allows us to load it into a Datastore to interact with other Functions and Tables, or deploy it onto a server ([Miner](https://ulixee.org/docs/hero/docs/miner)).

To use HeroFunctionPlugin, import the plugin and include it in the `plugins` vararg array of your Datastore Function constructor.

```js
import { HeroFunctionPlugin, Crawler } from '@ulixee/datastore-plugins-hero';
export default new Crawler(async context => {
  const { input, Output, Hero } = context;

  const hero = new Hero();
  await hero.goto(input.url);
  const title = await hero.document.title;

  const output = new Output();
  output.title = title;
  output.body = await hero.document.body.textContent;
  return hero;
}, HeroFunctionPlugin);
```

## Utilizing Two-Part Extraction

To use the [HeroReplay](https://ulixee.org/docs/hero/basics-client/hero-replay) extraction phase, you'll simply add an additional Function that uses a crawler:

```js
import { Crawler, Function, HeroFunctionPlugin } from '@ulixee/datastore-plugins-hero';

const datastore = new Datastore({
  crawlers: {
    ulixee: new Crawler(async context => {
      const { Hero } = context;
      const hero = new Hero();
      await hero.goto('https://ulixee.org');
      console.log(await hero.sessionId);
      await document.querySelector('h1').$addToDetachedElements('h1');
      return hero;
    }, HeroFunctionPlugin),
  },
  functions: {
    ulixee: new Function(async context => {
      const { input, Output, HeroReplay } = context;
      const maxTimeInCache = input.maxTimeInCache || 5 * 60;
      const crawler = datastore.crawlers.ulixee;
      const heroReplay = await HeroReplay.fromCrawler(crawler, { input: { maxTimeInCache } });
      const h1 = await heroReplay.detachedElements.get('h1');
      const output = new Output();
      output.title = h1.textContent;
    }, HeroFunctionPlugin),
  },
});
export default datastore;
```

If you have a prior Hero SessionId to replay, you can run ONLY the `Function` phase by running as follows:

```bash
node ./heroFunction.js --maxTimeInCache=30
```

## Changes to FunctionContext

The HeroFunctionPlugin for Hero adds "automatically connecting" Hero and Hero Replay constructors.

### run _(functionContext)_ {#run-hero}

- functionContext.Hero `Hero`. [Hero](https://ulixee.org/docs/hero/basic-client/hero) constructor that is automatically connected and cleaned up.
- functionContext.HeroReplay `HeroReplay`. [HeroReplay](https://ulixee.org/docs/hero/basic-client/hero-replay) constructor that's automatically connected and cleaned up. Includes an extra static function `fromCrawler` to create an instance from a [Crawler](../basics/crawler.md) instance.
  - `static fromCrawler_(crawler, options)_`. Arguments: [crawler](../basics/crawler.md) - a Crawler instance, and options: all options that can be passed to a Function `run` callback. Options will be merged with the calling FunctionContext. Input values provided will be merged with existing input values.

## Constructor

### new Function _(runCallback | functionComponents)_ {#constructor}

The HeroFunctionPlugin modifies the Function constructor with the following changes:

#### **Arguments**:

- run: `function`(functionContext): `Promise<any>`. Adds a Hero and HeroReplay constructor to the run function as per [above](#run-hero).