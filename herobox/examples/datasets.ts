import Herobox from '@ulixee/herobox';

export default new Herobox(async herobox => {
  const { input, output, hero } = herobox;
  input.url ??= 'https://ulixee.org';
  await hero.goto('https://ulixee.org');

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
    const frozenTab = await hero.detach(hero.activeTab);
    const cost = await frozenTab.document.querySelector('.cost .large-text').innerText;
    output.push({ cost, title });
    await hero.goBack();
    await hero.waitForLocation('change');
  }
});
