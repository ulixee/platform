import Datastore, { Extractor } from '@ulixee/datastore';

export default new Datastore({
  id: 'end-to-end',
  version: '0.0.1',
  extractors: {
    default: new Extractor({
      pricePerQuery: 50e4, // ~50 cents
      run(ctx) {
        ctx.Output.emit({ success: true, input: ctx.input });
      },
    }),
  },
});
