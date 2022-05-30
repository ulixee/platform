import Databox from '@ulixee/databox-for-hero';
import { testFunction } from './helper';

export default new Databox({
  defaults: {
    input: {
      url: 'https://example.org',
    },
  },
  async run(databox) {
    const text = testFunction();
    const { input, output, hero } = databox;

    await hero.goto(input.url);
    const title = await hero.document.title;

    output.text = text;
    output.title = title;
    output.body = await hero.document.body.textContent;
    console.log(`LOADED ${input.url}: ${title}`);
    await hero.close();
  },
});
