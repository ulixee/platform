import Datastore, { Function } from '@ulixee/datastore';
import { boolean, object, string } from '@ulixee/schema';

export default new Datastore({
  functions: {
    cloneUpstream: new Function({
      run(ctx) {
        ctx.Output.emit({ success: true });
      },
      schema: {
        input: {
          field: string({ minLength: 1, description: 'a field you should use' }),
          nested: object({
            fields: {
              field2: boolean(),
            },
            optional: true,
          }),
        },
        output: {
          success: boolean(),
        },
      },
    }),
  },
});
