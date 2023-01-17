import Datastore, { Function } from '@ulixee/datastore';

export default new Datastore({
  functions: {
    default: new Function({
      pricePerQuery: 50e4, // ~50 cents
      run(ctx) {
        ctx.Output.emit({ success: true, input: ctx.input });
      },
    }),
  },
});
