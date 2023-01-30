import Datastore, { Runner } from '@ulixee/datastore';

export default new Datastore({
  runners: {
    query: new Runner(ctx => {
      ctx.Output.emit({ success: true });
    }),
  },
});
