import Datastore, { Extractor } from '@ulixee/datastore';

export default new Datastore({
  extractors: {
    query: new Extractor(ctx => {
      ctx.Output.emit({ success: true });
    }),
  },
});
