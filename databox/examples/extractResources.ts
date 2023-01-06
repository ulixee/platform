// NOTE: you must start your own Ulixee Miner to run this example.

import { Crawler, Databox, Function, HeroFunctionPlugin } from '@ulixee/databox-plugins-hero';
import * as moment from 'moment';

const databox = new Databox({
  crawlers: {
    crawl: new Crawler(async ({ Hero }) => {
      const hero = new Hero();
      await hero.goto('https://ulixee.org');

      const resources = await hero.activeTab.waitForResources({ url: 'index.json' });
      for (const resource of resources) await resource.$addToDetachedResources('xhr');
      return hero;
    }, HeroFunctionPlugin),
  },
  functions: {
    extract: new Function(async ({ HeroReplay, Output }) => {
      const lastRun = await databox.crawl('crawl', { maxTimeInCache: 24 * 60 * 60 });

      const heroReplay = new HeroReplay(lastRun);
      const { detachedResources } = heroReplay;
      const xhrs = await detachedResources.getAll('xhr');

      console.log(xhrs);
      const output = new Output();
      output.gridsomeData = [];
      for (const xhr of xhrs) {
        // NOTE: synchronous APIs.
        const jsonObject = xhr.json;
        console.log(jsonObject);
        if (jsonObject.data) {
          output.gridsomeData.push(jsonObject.data);
        }
      }
    }, HeroFunctionPlugin),
  },
});

export default databox;
