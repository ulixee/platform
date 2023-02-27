// NOTE: you must start your own Ulixee Cloud to run this example.

import { Runner, HeroRunnerPlugin } from '@ulixee/datastore-plugins-hero';

export default new Runner(async context => {
  const { Output, Hero } = context;
  const hero = new Hero();
  await hero.goto('https://ulixee.org');
  await hero.querySelector('.datasets').$waitForVisible();

  const { document } = hero;
  const datasets = await document.querySelectorAll('.datasets .title');

  const length = await datasets.length;
  for (let i = 0; i < length; i += 1) {
    const dataset = await document.querySelectorAll('.datasets .title')[i];
    const title = await dataset.textContent;
    await hero.click(dataset);
    await hero.waitForLocation('change');
    await hero.waitForState(assert => {
      assert(hero.querySelector('.DatasetHeader .dataset').$isVisible);
      assert(hero.querySelector('.cost .large-text').$isVisible);
    });
    const cost = await hero.querySelector('.cost .large-text').innerText;
    new Output({ cost, title });
    await hero.goBack();
    await hero.waitForLocation('change');
  }
}, HeroRunnerPlugin);
