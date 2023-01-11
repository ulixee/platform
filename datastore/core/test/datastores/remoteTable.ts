import Datastore, { Table } from '@ulixee/datastore';
import { boolean, string } from '@ulixee/schema';

export default new Datastore({
  tables: {
    remote: new Table({
      schema: {
        title: string(),
        success: boolean(),
      },
      seedlings: [
        { title: 'Hello', success: true },
        { title: 'World', success: false },
      ],
    }),
  },
});
