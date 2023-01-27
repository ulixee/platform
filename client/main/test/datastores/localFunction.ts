import { Function } from '@ulixee/datastore';
import { boolean, string } from '@ulixee/schema';

export default new Function({
  name: 'test',
  run(ctx) {
    ctx.Output.emit({
      testerEcho: ctx.input.shouldTest,
      lastName: 'Clark',
      greeting: 'Hello world',
    });
  },
  schema: {
    input: {
      shouldTest: boolean(),
    },
    output: {
      testerEcho: boolean(),
      lastName: string(),
      greeting: string(),
    },
  },
});