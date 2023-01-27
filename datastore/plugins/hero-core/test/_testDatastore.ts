import Datastore, { Runner } from '@ulixee/datastore';
import { HeroRunnerPlugin } from '@ulixee/datastore-plugins-hero';

export default new Datastore({
  runners: {
    default: new Runner(
      {
        async run({ Hero, input, Output }) {
          const hero = new Hero();
          await hero.goto(input.url);
          await hero.waitForPaintingStable();
          new Output({ title: await hero.document.title });
        },
      },
      HeroRunnerPlugin,
    ),
  },
});
