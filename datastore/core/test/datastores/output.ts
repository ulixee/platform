import Datastore, { Function } from '@ulixee/datastore';

export default new Datastore({
  functions: {
    putout: new Function(ctx => {
      ctx.Output.emit({ success: true });
    }),
  },
});
