import Datastore, { Extractor } from '@ulixee/datastore';
import { HeroExtractorPlugin } from '@ulixee/datastore-plugins-hero';

import { testExtractor } from './helper';

export default new Datastore({
  extractors: {
    default: new Extractor(
      {
        async run({ Output }) {
          Output.emit({ text: testExtractor() });
        },
      },
      HeroExtractorPlugin,
    ),
  },
});
// test exporting another thing
export { testExtractor };
