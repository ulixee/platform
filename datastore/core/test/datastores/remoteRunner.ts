import Datastore, { Runner } from '@ulixee/datastore';
import { boolean, string } from '@ulixee/schema';

export default new Datastore({
  runners: {
    remote: new Runner({
      run(ctx) {
        new ctx.Output({ iAmRemote: true, echo: ctx.input.test });
      },
      schema: {
        input: {
          test: string(),
        },
        output: {
          iAmRemote: boolean(),
          echo: string(),
        },
      },
    }),
  },
});
