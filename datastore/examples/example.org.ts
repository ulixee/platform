// NOTE: you must start your own Ulixee Miner to run this example.

import { Runner, HeroRunnerPlugin, Schema } from '@ulixee/datastore-plugins-hero';

const { string } = Schema;

// configure input.url by running as node example.org.js --input.url="https://ulixee.org"

export default new Runner(
  {
    async run(context) {
      const { input, Output, Hero } = context;
      const hero = new Hero();
      await hero.goto(input.url);
      const title = await hero.document.title;

      const output = new Output();
      output.title = title;
      output.body = await hero.document.body.textContent;
      console.log(`LOADED ${input.url}: ${title}`);
      await hero.close();
    },
    schema: {
      input: {
        url: string({ format: 'url' }),
      },
      output: {
        title: string(),
        body: string(),
      },
      inputExamples: [
        {
          url: 'https://example.org',
        },
      ],
    },
  },
  HeroRunnerPlugin,
);
