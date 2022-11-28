// NOTE: you must start your own Ulixee Miner to run this example.

import { Function, HeroFunctionPlugin } from '@ulixee/databox-plugins-hero';

export default new Function(
  {
    async run({ hero }) {
      await hero.goto('https://ulixee.org');
      const h1 = await hero.querySelector('h1').$waitForVisible();
      // Extract the DOM Element at this moment in time.
      await h1.$addToDetachedElements('h1');
    },
    async afterHeroCompletes({ heroReplay, output }) {
      const h1 = await heroReplay.detachedElements.get('h1');
      // NOTE: synchronous APIs. No longer running in browser.
      output.text = h1.textContent;
      const divs = h1.querySelectorAll('div');
      output.divs = { count: divs.length, textLengths: [...divs].map(x => x.textContent.length) };
      console.log(output);
    },
  },
  HeroFunctionPlugin,
);
