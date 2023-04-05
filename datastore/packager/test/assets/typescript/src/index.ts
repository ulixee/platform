import Datastore, { Runner } from '@ulixee/datastore';
import { HeroRunnerPlugin } from '@ulixee/datastore-plugins-hero';
import { ISuperElement } from '@ulixee/hero';
import { testRunner } from './helper';
import { dateAdd, string } from '@ulixee/schema';

const runner = new Runner(
  {
    async run(context) {
      const text = testRunner();
      const { input, Output, Hero } = context;

      const hero = new Hero();
      await hero.goto(input.url);
      const title: string = await hero.document.title;
      const node: ISuperElement = hero.document.body;
      const body: string = await node.textContent;

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
  HeroRunnerPlugin,
);

export default new Datastore({
  runners: {
    default: runner,
  },
});
