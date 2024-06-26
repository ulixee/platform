import Datastore, { Extractor, Table } from '@ulixee/datastore';
import { boolean, string } from '@ulixee/schema';

export default new Datastore({
  id: 'payments',
  extractors: {
    testPayments: new Extractor({
      run(ctx) {
        if (ctx.input.explode) throw new Error('Explosive error');
        ctx.Output.emit({ success: true });
      },
      schema: {
        input: {
          explode: boolean({ optional: true }),
        },
        output: {
          success: boolean(),
        },
      },
    }),
  },
  tables: {
    successTitles: new Table({
      schema: {
        title: string(),
        success: boolean(),
      },
    }),
    titleNames: new Table({
      schema: {
        title: string(),
        name: string(),
      },
    }),
  },
  async onCreated(): Promise<void> {
    await this.tables.successTitles.insertInternal(
      { title: 'Hello', success: true },
      { title: 'World', success: false },
    );
    await this.tables.titleNames.insertInternal(
      { title: 'Hello', name: 'Blake' },
      { title: 'World', name: 'Caleb' },
    );
  },
});
