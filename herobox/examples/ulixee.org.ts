import Herobox from '../index';

export default new Herobox(async herobox => {
  const { input, output, hero } = herobox;
  input.url ??= 'https://ulixee.org';

  await hero.goto('https://ulixee.org');

  const { document } = hero;
  await document.querySelector('h1').textContent;

  // // step 1 - look in dom
  // const datasets = await document.querySelectorAll('.datasets .title');
  //
  // // step 2 - start collecting datasets
  // output.datasets = [];
  // for (const dataset of datasets) {
  //   output.datasets.push(await dataset.textContent);
  // }
  //
  // // step 3 - look at the first one
  // await hero.click(datasets[0]);
  // await hero.waitForLocation('change');
});
