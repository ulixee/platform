import Datastore, { Extractor } from '@ulixee/datastore';

export default new Datastore({
  id: 'output',
  extractors: {
    putout: new Extractor(ctx => {
      ctx.Output.emit({ success: true });
    }),
  },
});
