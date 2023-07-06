import Datastore, { Extractor } from '@ulixee/datastore';
import { HeroExtractorPlugin } from '@ulixee/datastore-plugins-hero';
import { string } from '@ulixee/schema';

/**
 * 1. We wrapped the script in a Datastore.
 */
const datastore = new Datastore({
  name: 'Tutorial',
  extractors: {
    /**
     * 1b. We created a Extractor called docsPages.
     */
    docPages: new Extractor(
      {
        pricePerQuery: 10_000,
        async run({ input, Hero, Output }) {
          const hero = new Hero();
          await hero.goto(`https://ulixee.org/docs/${input.tool}`);

          await hero.querySelector('.LEFTBAR').$waitForVisible();
          const links = await hero.querySelectorAll('.LEFTBAR a');

          for (const link of await links) {
            /**
             * 2. We replaced console.log with Output.
             */
            Output.emit({
              title: await link.innerText,
              href: await link.href,
            });
          }

          await hero.close();
        },
        /**
         * 3. We defined the schema of the Extractor function.
         */
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
