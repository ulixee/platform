import Databox, { Function } from '@ulixee/databox';
import { HeroFunctionPlugin } from '@ulixee/databox-plugins-hero';

import { testFunction } from './helper';

export default new Databox({
  functions: {
    default: new Function({
      async run(databox) {
        const { hero, output } = databox;
        output.text = testFunction();
        await hero.close();
      },
    }, HeroFunctionPlugin),
  },
});
// test exporting another thing
export { testFunction };
