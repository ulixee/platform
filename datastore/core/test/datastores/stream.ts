import Datastore, { Runner, Table } from '@ulixee/datastore';
import { boolean, string } from '@ulixee/schema';

export default new Datastore({
  runners: {
    streamer: new Runner(async ctx => {
      for (let i = 0; i < 3; i += 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
        ctx.Output.emit({ record: i });
      }
    }),
  },
  tables: {
    streamTable: new Table({
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
