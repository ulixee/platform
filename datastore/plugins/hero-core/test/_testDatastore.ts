import Datastore, { Runner } from '@ulixee/datastore';
import { Crawler, HeroRunnerPlugin } from '@ulixee/datastore-plugins-hero';

const datastore = new Datastore({
  crawlers: {
    defaultCrawl: new Crawler(
      {
        async run({ Hero, input }) {
          const hero = new Hero();
          await hero.goto(input.url);
          await hero.waitForPaintingStable();
          await hero.setSnippet('title', await hero.document.title);
          return hero;
        },
      },
      HeroRunnerPlugin,
    ),
  },
  runners: {
    default: new Runner(
      {
        async run({ HeroReplay, Output }) {
          const hero = await HeroReplay.fromCrawler(datastore.crawlers.defaultCrawl);
          new Output({ title: await hero.getSnippet('title') });
        },
      },
      HeroRunnerPlugin,
    ),
  },
});
export default datastore;
