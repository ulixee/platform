// NOTE: you must start your own Ulixee Cloud to run this example.

import { Runner, HeroRunnerPlugin } from '@ulixee/datastore-plugins-hero';

export default new Runner(async ctx => {
  const { input, Output, Hero } = ctx;
  input.url ??= 'https://ulixee.org';

  const hero = new Hero();

  await hero.goto('https://ulixee.org');
  await hero.waitForPaintingStable();

  const { document } = hero;
  await document.querySelector('h1').textContent;

  // step 1 - look in dom
  const datasets = await document.querySelectorAll('.datasets .title');

  // step 2 - start collecting datasets

  for (const dataset of datasets) {
    new Output({ dataset: await dataset.textContent }).emit();
  }

  // step 3 - look at the first one
  await hero.click(datasets[0]);
  await hero.waitForLocation('change');
}, HeroRunnerPlugin);
