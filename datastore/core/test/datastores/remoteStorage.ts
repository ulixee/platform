import Datastore, { Table } from '@ulixee/datastore';
import { boolean, string } from '@ulixee/schema';

export default new Datastore({
  tables: {
    intro: new Table({
      schema: {
        title: string(),
        visible: boolean(),
      },
    }),
  },
  async onCreated(): Promise<void> {
    await this.tables.intro.insertInternal(
      { title: 'Hello', visible: true },
      { title: 'World', visible: false },
    );
  },
});
