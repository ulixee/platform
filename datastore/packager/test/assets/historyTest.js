const Datastore = require('@ulixee/datastore');
const { Extractor, HeroExtractorPlugin } = require('@ulixee/datastore-plugins-hero');

exports.default = new Datastore({
  extractors: {
    default: new Extractor(() => null, HeroExtractorPlugin),
  },
});
