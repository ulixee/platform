import Databox, { Function } from '@ulixee/databox';
import { HeroFunctionPlugin } from '@ulixee/databox-plugins-hero';

export default new Databox({
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
