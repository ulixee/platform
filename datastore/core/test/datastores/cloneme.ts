import Datastore, { Function, Table } from '@ulixee/datastore';
import { boolean, date, object, string } from '@ulixee/schema';

export default new Datastore({
  functions: {
    cloneUpstream: new Function({
      run(ctx) {
        ctx.Output.emit({ success: true, affiliateId: ctx.callerAffiliateId });
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
          affiliateId: string(),
        },
      },
    }),
  },
  tables: {
    users: new Table({
      schema: {
        name: string(),
        birthdate: date(),
      },
      seedlings: [{ name: 'me', birthdate: new Date() }],
    }),
    private: new Table({
      isPublic: false,
      schema: {
        secret: string(),
        key: string(),
      },
    }),
  },
});
