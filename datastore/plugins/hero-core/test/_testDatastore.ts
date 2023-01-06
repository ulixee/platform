import Datastore, { Function } from '@ulixee/datastore';
import { HeroFunctionPlugin } from '@ulixee/datastore-plugins-hero';

export default new Datastore({
  functions: {
    default: new Function(
      {
        async run({ Hero, input, Output }) {
          const hero = new Hero();
          await hero.goto(input.url);
          await hero.waitForPaintingStable();
          new Output({ title: await hero.document.title });
        },
      },
      HeroFunctionPlugin,
    ),
  },
});
