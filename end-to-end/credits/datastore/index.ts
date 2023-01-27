import Datastore, { Runner } from '@ulixee/datastore';

export default new Datastore({
  runners: {
    default: new Runner({
      pricePerQuery: 50e4, // ~50 cents
      run(ctx) {
        ctx.Output.emit({ success: true, input: ctx.input });
      },
    }),
  },
});
