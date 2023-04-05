import Datastore, { Runner } from '@ulixee/datastore';
import { HeroRunnerPlugin } from '@ulixee/datastore-plugins-hero';
import { string } from '@ulixee/schema';

export default new Datastore({
  name: 'Tutorial',
  description: 'This is the example used in the Getting Started guide',
  /**
   * Configuring admin access.
   */
  adminIdentities: ['id13dheud78gd9am7azwmwu7rhds4n2xptpepzchlwmm54j5scq8flql4g0ql'],
  runners: {
    docPages: new Runner(
      {
        pricePerQuery: 10_000,
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
      HeroRunnerPlugin,
    ),
  },
});
