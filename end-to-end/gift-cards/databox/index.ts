import Databox, { Function } from '@ulixee/databox';

export default new Databox({
  functions: {
    default: new Function(ctx => {
      ctx.Output.emit({ success: true, input: ctx.input });
    }),
  },
});
