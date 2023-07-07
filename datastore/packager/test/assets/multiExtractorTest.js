const Datastore = require('@ulixee/datastore');
const { Extractor, HeroExtractorPlugin } = require('@ulixee/datastore-plugins-hero');
const { string } = require('@ulixee/schema');

exports.default = new Datastore({
  datastoreId:'dbx1p7u009xmljj0juw8sysnqteflx60lledwa9k0gkmlnta0a5v06qsh905hk',
  version:'0.0.1',
  extractors: {
    extractorWithInput: new Extractor(
      {
        schema: {
          input: {
            url: string({ format: 'url' }),
          },
        },
        async run({ input, Hero }) {
          const hero = new Hero();
          await hero.goto(input.url);
        },
      },
      HeroExtractorPlugin,
    ),
    extractorWithOutput: new Extractor({
      schema: {
        output: {
          title: string(),
          html: string(),
        },
      },
      async run({ Output }) {
        Output.emit({
          html: '<body></body>',
          title: 'This is the title',
        });
      },
    }),
  },
});
