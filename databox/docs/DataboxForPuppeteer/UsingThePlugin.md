# Using the DataboxForPuppeteer Plugin

> DataboxForPuppeteer supercharges your databox with a ready-to-use [`Puppeteer`](https://pptr.dev/api) instance.

To use DataboxForPuppeteer, import the plugin and include it in the `plugins` array of your Databox constructor:

```js
import Databox from '@ulixee/databox';
import { PuppeteerFunctionPlugin } from '@ulixee/databox-for-puppeteer';

export default new Databox({
  plugins: [PuppeteerFunctionPlugin],
  async run(databox) {
    const { input, output, browser } = databox;
    
    const page = await browser.newPage();
    await page.goto(`https://en.wikipedia.org/wiki/${input.pageSlug || 'Web_scraping'}`);
    output.title = await page.evaluate(() => {
      return document.querySelector('#firstHeading').textContent;
    });
  },
});
```

A simpler approach is use the DataboxForPuppeteer's default export, which automatically bundles the plugin. You can use it almost exactly the same as the standard Databox:

```js
import DataboxForPuppeteer from '@ulixee/databox-for-puppeteer';

export default new DataboxForPuppeteer(async databox => {
  const { input, output, browser } = databox;

  const page = await browser.newPage();
  await page.goto(`https://en.wikipedia.org/wiki/${input.pageSlug || 'Web_scraping'}`);
  output.title = await page.evaluate(() => {
    return document.querySelector('#firstHeading').textContent;
  });
});
```

DataboxForPuppeteer automatically cleans up and closes the puppeteer instance at the completion of each databox run.
