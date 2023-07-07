import Datastore, { Extractor, Table } from '@ulixee/datastore';
import { boolean, date, object, string } from '@ulixee/schema';

export default new Datastore({
  id: 'cloneme',
  version: '0.0.1',
  name: 'cloneme',
  extractors: {
    cloneUpstream: new Extractor({
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
      onCreated(): Promise<void> {
        return this.insertInternal({ name: 'me', birthdate: new Date() });
      },
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
