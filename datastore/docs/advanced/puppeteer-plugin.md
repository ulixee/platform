# Using the PuppeteerExtractorPlugin

> PuppeteerExtractorPlugin supercharges your datastore Extractor with a ready-to-use [`Puppeteer`](https://pptr.dev/api) instance.

To use PuppeteerExtractorPlugin, import the plugin and include it in the `plugins` array of your Extractor constructor:

```js
import Datastore from '@ulixee/datastore';
import { Extractor, PuppeteerExtractorPlugin } from '@ulixee/datastore-plugins-puppeteer';

export default new Datastore({
  extractors: {
    pupp: new Extractor(async ctx => {
      const { input, Output, launchBrowser } = ctx;
      
      const browser = await launchBrowser();
      const page = await browser.newPage();
      await page.goto(`https://en.wikipedia.org/wiki/${input.pageSlug || 'Web_scraping'}`);
      Output.emit({
        title: await page.evaluate(() => {
          return document.querySelector('#firstHeading').textContent;
        }),
      });
    }, PuppeteerExtractorPlugin),
  },
});
```

## Changes to ExtractorContext

The PuppeteerExtractorPlugin adds a single property to the [ExtractorContext](../basics/extractor-context.md).

### run _(extractorContext)_ {#run-hero}

- extractorContext.launchBrowser: () => Promise<`Puppeteer`>. Extractor to launch a new [Puppeteer](https://pptr.dev/api) Browser instance.

### Extractor.stream(... puppeteerLaunchArgs)

Configure the [Puppeteer](https://pptr.dev/api) instance with [LaunchOptions](https://pptr.dev/api/puppeteer.launchoptions).

```js
import Datastore from '@ulixee/datastore';
import { Extractor, PuppeteerExtractorPlugin } from '@ulixee/datastore-plugins-puppeteer';

const datastore = new Datastore({
  extractors: {
    pupp: new Extractor(async ctx => {
      const page = await ctx.browser.newPage();
      output.title = await page.evaluate(() => {
        return document.querySelector('title').textContent;
      });
    }, PuppeteerExtractorPlugin),
  },
});
await datastore.extractors.pupp.runInternal({ waitForInitialPage: false });
```
