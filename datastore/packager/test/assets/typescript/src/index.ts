import Datastore, { Extractor } from '@ulixee/datastore';
import { HeroExtractorPlugin } from '@ulixee/datastore-plugins-hero';
import { ISuperElement } from '@ulixee/hero';
import { testExtractor } from './helper';
import { dateAdd, string } from '@ulixee/schema';

const extractor = new Extractor(
  {
    async run(context) {
      const text = testExtractor();
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
  HeroExtractorPlugin,
);

export default new Datastore({
  extractors: {
    default: extractor,
  },
});
