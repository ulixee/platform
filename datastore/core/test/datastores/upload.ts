import Datastore, { Function } from '@ulixee/datastore';
import { boolean } from '@ulixee/schema';

export default new Datastore({
  functions: {
    upTest: new Function({
      run(ctx) {
        ctx.Output.emit({ upload: true });
      },
      schema: {
        output: { upload: boolean({ description: 'Whether or not this test succeeded' }) },
      },
    }),
  },
});
