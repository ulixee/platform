import Datastore, { Extractor } from '@ulixee/datastore';
import { HeroExtractorPlugin } from '@ulixee/datastore-plugins-hero';
import { string } from '@ulixee/schema';

const datastore = new Datastore({
  name: 'Tutorial',
  extractors: {
    docPages: new Extractor(
      {
        async run({ input, Hero, Output }) {
          const hero = new Hero();
          await hero.goto(`https://ulixee.org/docs/${input.tool}`);

          await hero.querySelector('.LEFTBAR').$waitForVisible();
          const links = await hero.querySelectorAll('.LEFTBAR a');

          for (const link of await links) {
            Output.emit({
              title: await link.innerText,
              href: await link.href,
            });
          }

          await hero.close();
        },
        schema: {
          input: {
            tool: string({
              enum: ['hero', 'datastore', 'cloud', 'client'],
            }),
          },
          output: {
            title: string(),
            href: string({ format: 'url' }),
          },
        },
      },
      HeroExtractorPlugin,
    ),
  },
});

export default datastore;
