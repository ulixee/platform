import Datastore, { Function } from '@ulixee/datastore';
import { HeroFunctionPlugin } from '@ulixee/datastore-plugins-hero';

import { testFunction } from './helper';

export default new Datastore({
  functions: {
    default: new Function(
      {
        async run({ Output }) {
          Output.emit({ text: testFunction() });
        },
      },
      HeroFunctionPlugin,
    ),
  },
});
// test exporting another thing
export { testFunction };
