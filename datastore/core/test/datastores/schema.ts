import Datastore, { Function } from '@ulixee/datastore';
import { boolean, string } from '@ulixee/schema';

export default new Datastore({
  functions: {
    default: new Function({
      run(ctx) {
        ctx.Output.emit({ success: true });
      },
      schema: {
        input: {
          field: string({ minLength: 1, description: 'a field you should use' }),
        },
        output: {
          success: boolean(),
        },
      },
    }),
  },
});
