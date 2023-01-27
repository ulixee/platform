import { Runner } from '@ulixee/datastore';
import { boolean } from '@ulixee/schema';

export default new Runner({
  run(ctx) {
    ctx.Output.emit({ testerEcho: ctx.input.tester });
  },
  schema: {
    input: {
      tester: boolean(),
    },
    output: {
      testerEcho: boolean(),
    },
  },
});
