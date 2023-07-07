import Datastore, { Extractor } from '@ulixee/datastore';

export default new Datastore({
  id: 'query',
  version: '0.0.1',
  extractors: {
    query: new Extractor(ctx => {
      ctx.Output.emit({ success: true });
    }),
  },
});
