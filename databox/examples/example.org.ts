// NOTE: you must start your own Ulixee Miner to run this example.

import { Function, HeroFunctionPlugin, Schema } from '@ulixee/databox-plugins-hero';

const { string } = Schema;

// configure input.url by running as node example.org.js --input.url="https://ulixee.org"

export default new Function(
  {
    async run(databox) {
      const { input, output, hero } = databox;

      await hero.goto(input.url);
      const title = await hero.document.title;

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
  HeroFunctionPlugin,
);
