# Using the PuppeteerFunctionPlugin

> PuppeteerFunctionPlugin supercharges your datastore Function with a ready-to-use [`Puppeteer`](https://pptr.dev/api) instance.

To use PuppeteerFunctionPlugin, import the plugin and include it in the `plugins` array of your Function constructor:

```js
import Datastore from '@ulixee/datastore';
import { Function, PuppeteerFunctionPlugin } from '@ulixee/datastore-plugins-puppeteer';

export default new Datastore({
  functions: {
    pupp: new Function(async ctx => {
      const { input, Output, launchBrowser } = ctx;

      const browser = await launchBrowser();
      const page = await browser.newPage();
      await page.goto(`https://en.wikipedia.org/wiki/${input.pageSlug || 'Web_scraping'}`);
      Output.emit({
        title: await page.evaluate(() => {
          return document.querySelector('#firstHeading').textContent;
        }),
      });
    }, PuppeteerFunctionPlugin),
  },
});
```

## Changes to FunctionContext

The PuppeteerFunctionPlugin adds a single property to the [FunctionContext](../basics/function-context.md).

### run _(functionContext)_ {#run-hero}

- functionContext.launchBrowser: () => Promise<`Puppeteer`>. Function to launch a new [Puppeteer](https://pptr.dev/api) Browser instance.

### Function.stream(... puppeteerLaunchArgs)

Configure the [Puppeteer](https://pptr.dev/api) instance with [LaunchOptions](https://pptr.dev/api/puppeteer.launchoptions).

```js
import Datastore from '@ulixee/datastore';
import { Function, PuppeteerFunctionPlugin } from '@ulixee/datastore-plugins-puppeteer';

const datastore = new Datastore({
  functions: {
    pupp: new Function(async ctx => {
      const page = await ctx.browser.newPage();
      output.title = await page.evaluate(() => {
        return document.querySelector('title').textContent;
      });
    }, PuppeteerFunctionPlugin),
  },
});
await datastore.functions.pupp.stream({ waitForInitialPage: false });
```
