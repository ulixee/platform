import Databox from '@ulixee/databox-for-hero';

export default new Databox({
  async run({ hero }) {
    await hero.goto('https://ulixee.org');
    const h1 = await hero.querySelector('h1').$waitForVisible();
    // Extract the DOM Element at this moment in time.
    await h1.$extractLater('h1');
  },
  async extract({ collectedElements, output }) {
    const h1 = await collectedElements.get('h1');
    // NOTE: synchronous APIs. No longer running in browser.
    output.text = h1.textContent;
    const divs = h1.querySelectorAll('div');
    output.divs = { count: divs.length, textLengths: [...divs].map(x => x.textContent.length) };
    console.log(output);
  },
});
