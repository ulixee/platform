// NOTE: you must start your own Ulixee Miner to run this example.

import { Function, HeroFunctionPlugin } from '@ulixee/databox-plugins-hero';

export default new Function(
  {
    async run({ hero }) {
      await hero.goto('https://ulixee.org');

      const resources = await hero.activeTab.waitForResources({ url: 'index.json' });
      for (const resource of resources) await resource.$addToDetachedResources('xhr');
    },
    async afterHeroCompletes({ heroReplay, output }) {
      const { detachedResources } = heroReplay;
      const xhrs = await detachedResources.getAll('xhr');
      output.gridsomeData = [];
      console.log(xhrs);
      for (const xhr of xhrs) {
        // NOTE: synchronous APIs.
        const jsonObject = xhr.json;
        console.log(jsonObject);
        if (jsonObject.data) {
          output.gridsomeData.push(jsonObject.data);
        }
      }
    },
  },
  HeroFunctionPlugin,
);
