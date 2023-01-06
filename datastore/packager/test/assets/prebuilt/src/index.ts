import Datastore, { Function } from '@ulixee/datastore';
import { HeroFunctionPlugin } from '@ulixee/datastore-plugins-hero';
import { testFunction } from './helper';

export default new Datastore({
  functions: {
    default: new Function(
      {
        async run(ctx) {
          const text = testFunction();
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
      HeroFunctionPlugin,
    ),
  },
});
