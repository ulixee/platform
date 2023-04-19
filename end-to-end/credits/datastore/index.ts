import Datastore, { Extractor } from '@ulixee/datastore';

export default new Datastore({
  extractors: {
    default: new Extractor({
      pricePerQuery: 50e4, // ~50 cents
      run(ctx) {
        ctx.Output.emit({ success: true, input: ctx.input });
      },
    }),
  },
});
