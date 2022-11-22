import Databox, { Function } from '@ulixee/databox';

export default new Databox({
  functions: {
    putout: new Function(ctx => {
      ctx.output = { success: true };
    }),
  },
});
