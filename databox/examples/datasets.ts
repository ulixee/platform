import Databox from '@ulixee/databox';

export default new Databox(async databox => {
  const { input, output, hero } = databox;
  input.url ??= 'https://ulixee.org';
  await hero.goto('https://ulixee.org');
  await hero.querySelector('.datasets').$waitForVisible();

  const { document } = hero;
  // step 1 - look in dom
  const datasets = await document.querySelectorAll('.datasets .title');

  output.datasets = [];
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
    output.push({ cost, title });
    await hero.goBack();
    await hero.waitForLocation('change');
  }
});
