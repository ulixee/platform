import { Table } from '@ulixee/datastore';
import { boolean, string } from '@ulixee/schema';

export default new Table({
  name: 'testing',
  schema: {
    title: string(),
    success: boolean(),
  },
  async onCreated() {
    await this.insertInternal(
      { title: 'Hello', success: true },
      { title: 'World', success: false },
    );
  },
});
