import Databox from '@ulixee/databox-for-hero';
import { testFunction } from './helper';
import { string, dateAdd } from '@ulixee/schema';

export default new Databox({
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
  schema: {
    input: {
      url: string({
        format: 'url',
      }),
      date: string({
        format: 'date',
      }),
    },
    output: {
      text: string(),
      title: string({
        description: 'The html title tag',
      }),
      body: string(),
    },
    inputExamples: [{ url: 'https://example.com', date: dateAdd(1, 'days') }],
  },
});
