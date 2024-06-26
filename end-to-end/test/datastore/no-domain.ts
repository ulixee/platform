import Datastore, { Extractor } from '@ulixee/datastore';

export default new Datastore({
  id: 'no-domain',
  version: '0.0.1',
  extractors: {
    nod: new Extractor({
      basePrice: 1000, // 1 milligon
      run(ctx) {
        ctx.Output.emit({ noDomain: true });
      },
    }),
  },
});
