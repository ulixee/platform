import Databox, { Function } from '@ulixee/databox';
import { HeroFunctionPlugin } from '@ulixee/databox-plugins-hero';

export default new Databox({
  functions: {
    default: new Function({
      async run({ hero, input, output }) {
        await hero.goto(input.url);
        await hero.waitForPaintingStable();
        output.title = await hero.document.title;
      }
    }, HeroFunctionPlugin),
  },
});
