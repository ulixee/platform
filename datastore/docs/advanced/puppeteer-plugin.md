# Using the PuppeteerRunnerPlugin

> PuppeteerRunnerPlugin supercharges your datastore Runner with a ready-to-use [`Puppeteer`](https://pptr.dev/api) instance.

To use PuppeteerRunnerPlugin, import the plugin and include it in the `plugins` array of your Runner constructor:

```js
import Datastore from '@ulixee/datastore';
import { Runner, PuppeteerRunnerPlugin } from '@ulixee/datastore-plugins-puppeteer';

export default new Datastore({
  runners: {
    pupp: new Runner(async ctx => {
      const { input, Output, launchBrowser } = ctx;

      const browser = await launchBrowser();
      const page = await browser.newPage();
      await page.goto(`https://en.wikipedia.org/wiki/${input.pageSlug || 'Web_scraping'}`);
      Output.emit({
        title: await page.evaluate(() => {
          return document.querySelector('#firstHeading').textContent;
        }),
      });
    }, PuppeteerRunnerPlugin),
  },
});
```

## Changes to RunnerContext

The PuppeteerRunnerPlugin adds a single property to the [RunnerContext](../basics/function-context.md).

### run _(functionContext)_ {#run-hero}

- functionContext.launchBrowser: () => Promise<`Puppeteer`>. Runner to launch a new [Puppeteer](https://pptr.dev/api) Browser instance.

### Runner.stream(... puppeteerLaunchArgs)

Configure the [Puppeteer](https://pptr.dev/api) instance with [LaunchOptions](https://pptr.dev/api/puppeteer.launchoptions).

```js
import Datastore from '@ulixee/datastore';
import { Runner, PuppeteerRunnerPlugin } from '@ulixee/datastore-plugins-puppeteer';

const datastore = new Datastore({
  runners: {
    pupp: new Runner(async ctx => {
      const page = await ctx.browser.newPage();
      output.title = await page.evaluate(() => {
        return document.querySelector('title').textContent;
      });
    }, PuppeteerRunnerPlugin),
  },
});
await datastore.runners.pupp.runInternal({ waitForInitialPage: false });
```
