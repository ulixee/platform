# HeroFunctionPlugin

> HeroFunctionPlugin supercharges your databox Function with full Hero capabilities. It also allow you to organize your script into two execution stages - the "live" `run` callback and a second "replayed" `afterRun` callback.

Databox Functions with HeroFunctionPlugin allow you break down your script into a "live" (run) phase and an "offline extraction" (afterRun) phase.

The 'run' step is passed a pre-initialized [Hero](https://ulixee.org/docs/hero) instance to interact with a website. You can collect all output in this phase, or you can choose to detach assets like [Resources](https://ulixee.org/docs/hero/docs/hero/advanced-client/detached-resources), [HTML Elements](https://ulixee.org/docs/hero/docs/hero/advanced-client/detached-elements) and [Data Snippets](https://ulixee.org/docs/hero/basic-client/hero-replay#getSnippet) that can be extracted later.

The 'afterRun' step is passed in a [HeroReplay](https://ulixee.org/docs/hero/docs/hero/basics-client/hero-replay) instance instead of a "live" Hero. You can use this function to pull out data from your [Detached assets](https://ulixee.org/docs/hero/docs/hero/basics-client/hero-replay) (ie, you don't have to run your logic browser-side). It also allows you to run your extraction logic as a unit, which enables you to re-run it on assets collected from your last `run` until your logic works correctly.

## Getting Started

Writing a Hero script with a Databox Function is very similar to writing a normal Hero script, except it must be contained within a callback, and you have make it the default export.

You can run this script as a regular node script and it will run the callback. However, this structure also allows us to load it into a Databox to interact with other Functions and Tables, or deploy it onto a server ([Miner](https://ulixee.org/docs/hero/docs/miner)).

To use HeroFunctionPlugin, import the plugin and include it in the `plugins` vararg array of your Databox Function constructor.

```js
import { HeroFunctionPlugin, Function } from '@ulixee/databox-plugins-hero';
export default new Function(async context => {
  const { input, Output, hero } = context;

  await hero.goto(input.url);
  const title = await hero.document.title;

  const output = new Output();
  output.title = title;
  output.body = await hero.document.body.textContent;
  await hero.close();
}, HeroFunctionPlugin);
```

## Utilizing Two-Part Extraction

To use the [HeroReplay](https://ulixee.org/docs/hero/basics-client/hero-replay) extraction phase, you'll simply add an additional afterRun callback:

```js
import { Function, HeroFunctionPlugin } from '@ulixee/databox-plugins-hero';

export default new Function(
  {
    async run(context) {
      const { hero } = context;
      await hero.goto('https://ulixee.org');
      console.log(await hero.sessionId);
      await document.querySelector('h1').$addToDetachedElements('h1');
    },
    async afterRun(context) {
      const { input, Output, heroReplay } = context;
      const h1 = await hero.detachedElements.get('h1');
      const output = new Output();
      output.title = h1.textContent;
    },
  },
  HeroFunctionPlugin,
);
```

If you have a prior Hero SessionId to replay, you can run ONLY the `afterRun` phase by running your function as follows:

```bash
node ./heroFunction.js --replaySessionId=session123
```

## Changes to FunctionContext

The HeroFunctionPlugin for Hero adds automatically initialized Hero instances to the `run` and `afterRun` phases of a Function.

### run _(functionContext)_ {#run-hero}

- functionContext.hero `Hero`. Readonly access to a pre-initialized [Hero](https://ulixee.org/docs/hero/basic-client/hero) instance.

### runAfter _(functionContext)_ {#runafter-hero}

- functionContext.heroReplay `HeroReplay`. Readonly access to a pre-initialized [HeroReplay](https://ulixee.org/docs/hero/basic-client/hero-replay) instance.

## Constructor

### new Function _(runCallback | functionComponents)_ {#constructor}

The HeroFunctionPlugin modifies the Function constructor with the following changes:

#### **Arguments**:

- run: `function`(functionContext): `Promise<any>`. Adds a hero instance to the run function as per [above](#run-hero).
- runAfter: `function`(functionContext): `Promise<any>`. An optional function where you can transform collected assets into your desired output structure. The only difference between this callback and `run` is that the FunctionContext supplies a [heroReplay](https://ulixee.org/docs/hero/basic-client/hero-replay) instance instead of `hero`.
- defaultHeroOptions [`IHeroCreateOptions`](https://ulixee.org/docs/hero/basic-client/hero#constructor). Configure Hero with any default options.

```js
import Databox, { Function } from '@ulixee/databox';
import { HeroFunctionPlugin } from '@ulixee/databox-plugins-hero';

export default new Databox({
  functions: {
    hero: new Function(
      {
        async run({ hero }) {
          const page = await hero.goto('https://ulixee.org');
          await page.$addToDetachedResources('default');
        },
        async afterRun({ heroReplay }) {
          const collected = await heroReplay.detachedResources.get('default');
        },
        defaultHeroOptions: {
          showChrome: true,
        },
      },
      HeroFunctionPlugin,
    ),
  },
});
```

## Passing In Hero-Specific Configuration

You can configure the supplied [Hero](https://ulixee.org/docs/hero) instance through the defaultHeroOptions added to the Function constructor. This can be helpful to supply common configurations to your :

```js
import { Function, HeroFunctionPlugin } from '@ulixee/databox-plugins-hero';

export default new Function(
  {
    defaultHeroOptions: {
      locale: 'en-GB,en',
    },
    async run(databox) {
      const { hero, input } = databox;
      await hero.goto(input.url);
      // expect en-GB
      const locale = await hero.getJsValue('navigator.language');
    },
  },
  HeroFunctionPlugin,
);
```
