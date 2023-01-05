# Using the PuppeteerFunctionPlugin

> PuppeteerFunctionPlugin supercharges your databox Function with a ready-to-use [`Puppeteer`](https://pptr.dev/api) instance.

To use PuppeteerFunctionPlugin, import the plugin and include it in the `plugins` array of your Function constructor:

```js
import Databox from '@ulixee/databox';
import { Function, PuppeteerFunctionPlugin } from '@ulixee/databox-plugins-puppeteer';

export default new Databox({
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
import Databox from '@ulixee/databox';
import { Function, PuppeteerFunctionPlugin } from '@ulixee/databox-plugins-puppeteer';

const databox = new Databox({
  functions: {
    pupp: new Function(async ctx => {
      const page = await ctx.browser.newPage();
      output.title = await page.evaluate(() => {
        return document.querySelector('title').textContent;
      });
    }, PuppeteerFunctionPlugin),
  },
});
await databox.functions.pupp.stream({ waitForInitialPage: false });
```
