import Datastore, { Table } from '@ulixee/datastore';
import { boolean, string } from '@ulixee/schema';

export default new Datastore({
  id: 'remote-table',
  version: '0.0.1',
  tables: {
    remote: new Table({
      schema: {
        title: string(),
        success: boolean(),
      },
    }),
  },
  async onCreated(): Promise<void> {
    await this.tables.remote.insertInternal(
      { title: 'Hello', success: true },
      { title: 'World', success: false },
    );
  },
});
