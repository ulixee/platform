import Databox, { Function } from '@ulixee/databox';
import { boolean, string } from '@ulixee/schema';

export default new Databox({
  functions: {
    remote: new Function({
      run(ctx) {
        ctx.output = { iAmRemote: true, echo: ctx.input.test };
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
