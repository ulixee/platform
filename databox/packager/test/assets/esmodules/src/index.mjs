import Databox from '@ulixee/databox-for-hero';
import { testFunction } from './helper';

export default new Databox({
  async run(databox) {
    const { hero, output } = databox;
    output.text = testFunction();
    await hero.close();
  },
});
