import Databox, { Function } from '@ulixee/databox';
import { HeroFunctionPlugin } from '@ulixee/databox-plugins-hero';
import { testFunction } from './helper';

export default new Databox({
  functions: {
    default: new Function(
      {
        async run(ctx) {
          const text = testFunction();
          const { input, output, hero } = ctx;

          await hero.goto('https://example.org');
          const title = await hero.document.title;

          output.text = text;
          output.title = title;
          output.body = await hero.document.body.textContent;
          console.log(`LOADED ${input.url}: ${title}`);
          await hero.close();
        },
      },
      HeroFunctionPlugin,
    ),
  },
});
