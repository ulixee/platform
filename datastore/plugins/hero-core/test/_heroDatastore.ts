import Datastore, { Extractor } from '@ulixee/datastore';
import { Crawler, HeroExtractorPlugin } from '@ulixee/datastore-plugins-hero';

const datastore = new Datastore({
  crawlers: {
    defaultCrawl: new Crawler(
      {
        async run({ Hero, input }) {
          const hero = new Hero();
          await hero.goto(input.url as string);
          await hero.waitForPaintingStable();
          await hero.setSnippet('title', await hero.document.title);
          return hero;
        },
      },
      HeroExtractorPlugin,
    ),
  },
  extractors: {
    getTitle: new Extractor(
      {
        async run({ HeroReplay, input, Output }) {
          const hero = await HeroReplay.fromCrawler(datastore.crawlers.defaultCrawl, {
            input,
          });
          new Output({ title: await hero.getSnippet('title') });
        },
      },
      HeroExtractorPlugin,
    ),
  },
});
export default datastore;
