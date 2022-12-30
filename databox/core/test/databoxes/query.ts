import Databox, { Function } from '@ulixee/databox';

export default new Databox({
  functions: {
    query: new Function(ctx => {
      ctx.Output.emit({ success: true });
    }),
  },
});
