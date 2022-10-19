import Databox from '@ulixee/databox';
import { boolean } from '@ulixee/schema';

export default new Databox({
  run(databox) {
    databox.output = { upload: true };
  },
  schema: {
    output: { upload: boolean({ description: 'Whether or not this test succeeded' }) },
  },
});
