import Datastore, { Function } from '@ulixee/datastore';

export default new Datastore({
  functions: {
    default: new Function(ctx => {
      ctx.Output.emit({ success: true, input: ctx.input });
    }),
  },
});
