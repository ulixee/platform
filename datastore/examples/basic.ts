// NOTE: you must start your own Ulixee Cloud to run this example.

import { Extractor, HeroExtractorPlugin } from '@ulixee/datastore-plugins-hero';

export default new Extractor(datastore => {
  console.log('INPUT: ', datastore.input);
}, HeroExtractorPlugin);
