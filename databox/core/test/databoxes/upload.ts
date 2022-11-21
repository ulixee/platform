import Databox, { Function } from '@ulixee/databox';
import { boolean } from '@ulixee/schema';

export default new Databox({
  functions: {
    upTest: new Function({
      run(ctx) {
        ctx.output = { upload: true };
      },
      schema: {
        output: { upload: boolean({ description: 'Whether or not this test succeeded' }) },
      },
    }),
  },
});
