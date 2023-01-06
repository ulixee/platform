import Databox, { Function } from '@ulixee/databox';
import { HeroFunctionPlugin } from '@ulixee/databox-plugins-hero';

import { testFunction } from './helper';

export default new Databox({
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
