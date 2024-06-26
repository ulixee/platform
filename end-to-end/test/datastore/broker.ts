import Datastore, { Extractor } from '@ulixee/datastore';

export default new Datastore({
  id: 'broker',
  version: '0.0.1',
  extractors: {
    default: new Extractor({
      basePrice: 50_000, // ~5 cents
      run(ctx) {
        ctx.Output.emit({ success: true, input: ctx.input });
      },
    }),
  },
});
