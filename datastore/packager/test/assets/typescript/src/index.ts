import Datastore, { Function } from '@ulixee/datastore';
import { HeroFunctionPlugin } from '@ulixee/datastore-plugins-hero';
import { testFunction } from './helper';
import { dateAdd, string } from '@ulixee/schema';

const func = new Function(
  {
    async run(context) {
      const text = testFunction();
      const { input, Output, Hero } = context;

      const hero = new Hero();
      await hero.goto(input.url);
      const title = await hero.document.title;
      const body = await hero.document.body.textContent;

      Output.emit({ text, title, body });
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
  },
  HeroFunctionPlugin,
);

export default new Datastore({
  functions: {
    default: func,
  },
});
