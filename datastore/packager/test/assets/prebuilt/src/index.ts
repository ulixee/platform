import Datastore, { Runner } from '@ulixee/datastore';
import { HeroRunnerPlugin } from '@ulixee/datastore-plugins-hero';
import { testRunner } from './helper';

export default new Datastore({
  runners: {
    default: new Runner(
      {
        async run(ctx) {
          const text = testRunner();
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
      HeroRunnerPlugin,
    ),
  },
});
