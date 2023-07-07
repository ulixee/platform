const Datastore = require('@ulixee/datastore');
const { Extractor, HeroExtractorPlugin } = require('@ulixee/datastore-plugins-hero');

exports.default = new Datastore({
  datastoreId: 'dbx1vcsr9gmfe2adgqyuyaluwaq0phjdsa2t3mv0eygj3lyvwjw5hkuqqv2rxs',
  extractors: {
    default: new Extractor(() => null, HeroExtractorPlugin),
  },
});
