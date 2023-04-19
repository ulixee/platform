import Datastore, { Extractor } from '@ulixee/datastore';

export default new Datastore({
  extractors: {
    putout: new Extractor(ctx => {
      ctx.Output.emit({ success: true });
    }),
  },
});
