import Datastore, { Extractor } from '@ulixee/datastore';

export default new Datastore({
  id: 'credits',
  version: '0.0.1',
  extractors: {
    default: new Extractor({
      basePrice: 500_000, // ~50 cents
      run(ctx) {
        ctx.Output.emit({ success: true, input: ctx.input });
      },
    }),
  },
});
