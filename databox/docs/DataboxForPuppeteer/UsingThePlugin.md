# Using the DataboxForPuppeteer Plugin

> DataboxForPuppeteer supercharges your databox with a ready-to-use Puppeteer instance.

To use DataboxForPuppeteer, import the plugin and include it in your Databox constructor object:

```js
import Databox from '@ulixee/databox';
import { DataboxForPuppeteerPlugin } = '@ulixee/databox-for-puppeteer';

export default new Databox({
  plugins: [DataboxForPuppeteerPlugin],
  async run(databox) {
    const { input, output, puppeteer } = databox;

    await puppeteer.goto(input.url);
    const title = await hero.document.title;

    output.title = title;
    output.body = await hero.document.body.textContent;
  },
});
```

The simpler approach is use the default DataboxForPuppeteer export, which automatically bundles the plugin into the instance. You can use it almost exactly the same as the standard Databox:

```js
import DataboxForPuppeteer = '@ulixee/databox-for-puppeteer';

export default new DataboxForPuppeteer(async databox => {
  const { input, output, hero } = databox;

  await hero.goto(input.url);
  const title = await hero.document.title;

  output.title = title;
  output.body = await hero.document.body.textContent;
});
```

DataboxForPuppeteer automatically cleans up and closes the puppeteer instance at the completion of each databox run.