import Datastore, { Runner } from '@ulixee/datastore';
import { boolean, string } from '@ulixee/schema';

export default new Datastore({
  runners: {
    default: new Runner({
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
