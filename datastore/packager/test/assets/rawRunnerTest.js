const { Extractor, HeroExtractorPlugin } = require('@ulixee/datastore-plugins-hero');

exports.default = new Extractor(({ Output }) => {
  Output.emit({ test: 1 });
}, HeroExtractorPlugin);
