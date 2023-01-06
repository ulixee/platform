import Datastore, { Function } from '@ulixee/datastore';

export default new Datastore({
  functions: {
    query: new Function(ctx => {
      ctx.Output.emit({ success: true });
    }),
  },
});
