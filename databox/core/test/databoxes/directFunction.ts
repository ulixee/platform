import { Function } from '@ulixee/databox';
import { boolean } from '@ulixee/schema';

export default new Function({
  run(ctx) {
    ctx.output = { testerEcho: ctx.input.tester };
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
