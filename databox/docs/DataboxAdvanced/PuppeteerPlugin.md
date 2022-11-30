# Using the PuppeteerFunctionPlugin

> PuppeteerFunctionPlugin supercharges your databox Function with a ready-to-use [`Puppeteer`](https://pptr.dev/api) instance.

To use PuppeteerFunctionPlugin, import the plugin and include it in the `plugins` array of your Function constructor:

```js
import Databox from '@ulixee/databox';
import { Function, PuppeteerFunctionPlugin } from '@ulixee/databox-plugins-puppeteer';

export default new Databox({
  functions: {
    pupp: new Function(async ctx => {
      const { input, output, browser } = ctx;

      const page = await browser.newPage();
      await page.goto(`https://en.wikipedia.org/wiki/${input.pageSlug || 'Web_scraping'}`);
      output.title = await page.evaluate(() => {
        return document.querySelector('#firstHeading').textContent;
      });
    }, PuppeteerFunctionPlugin),
  },
});
```

## Changes to FunctionContext

PuppeteerFunctionPlugin adds a single property to the [FunctionContext](/docs/databox/databox-basics/function-context).

### FunctionContext.browser

Readonly access to a pre-initialize [Puppeteer](https://pptr.dev/api) instance.

#### **Returns** [`Puppeteer`](https://pptr.dev/api)

## Changes to Function Components

PuppeteerFunctionPlugin adds an optional parameter to the Function Components [object](/docs/databox/databox-basics/function#constructor)) to configure Puppeteer options.

### Function Constructor Object: defaultPuppeteerOptions

Configure the [Puppeteer](https://pptr.dev/api) instance with [LaunchOptions](https://pptr.dev/api/puppeteer.launchoptions).

```js
import Databox from '@ulixee/databox';
import { Function, PuppeteerFunctionPlugin } from '@ulixee/databox-plugins-puppeteer';

export default new Databox({
  functions: {
    pupp: new Function(
      {
        async run(ctx) {
          const { input, output, browser } = ctx;

          const page = await browser.newPage();
          await page.goto(`https://en.wikipedia.org/wiki/${input.pageSlug || 'Web_scraping'}`);
          output.title = await page.evaluate(() => {
            return document.querySelector('#firstHeading').textContent;
          });
        },
        defaultPuppeteerOptions: {
          timeout: 60e3,
        },
      },
      PuppeteerFunctionPlugin,
    ),
  },
});
```

### Function.exec(... puppeteerLaunchArgs)

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
await databox.functions.pupp.exec({ waitForInitialPage: false });
```
