const { Extractor, HeroExtractorPlugin } = require('@ulixee/datastore-plugins-hero');
const { testExtractor } = require('./helper');

module.exports = new Extractor(
  {
    async run(ctx) {
      const { Output } = ctx;
      Output.emit({ text: testExtractor() });
    },
  },
  HeroExtractorPlugin,
);
