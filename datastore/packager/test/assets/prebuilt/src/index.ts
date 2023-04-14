import Datastore, { Extractor } from '@ulixee/datastore';
import { HeroExtractorPlugin } from '@ulixee/datastore-plugins-hero';
import { testExtractor } from './helper';

export default new Datastore({
  extractors: {
    default: new Extractor(
      {
        async run(ctx) {
          const text = testExtractor();
          const { input, Output, Hero } = ctx;
          const hero = new Hero();
          await hero.goto('https://example.org');
          const title = await hero.document.title;

          const output = new Output();
          output.text = text;
          output.title = title;
          output.body = await hero.document.body.textContent;
          console.log(`LOADED ${input.url}: ${title}`);
          await hero.close();
        },
      },
      HeroExtractorPlugin,
    ),
  },
});
