import Datastore, { Runner } from '@ulixee/datastore';
import { boolean } from '@ulixee/schema';

export default new Datastore({
  runners: {
    upTest: new Runner({
      run(ctx) {
        ctx.Output.emit({ upload: true });
      },
      schema: {
        output: { upload: boolean({ description: 'Whether or not this test succeeded' }) },
      },
    }),
  },
});
