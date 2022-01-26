import Databox from '@ulixee/databox';

export default new Databox(async databox => {
  const { input, output, hero } = databox;
  input.url ??= 'https://ulixee.org';

  await hero.goto('https://ulixee.org');
  await hero.waitForPaintingStable();

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
