import Datastore, { Runner } from '@ulixee/datastore';
import { HeroRunnerPlugin } from '@ulixee/datastore-plugins-hero';

import { testRunner } from './helper';

export default new Datastore({
  runners: {
    default: new Runner(
      {
        async run({ Output }) {
          Output.emit({ text: testRunner() });
        },
      },
      HeroRunnerPlugin,
    ),
  },
});
// test exporting another thing
export { testRunner };
