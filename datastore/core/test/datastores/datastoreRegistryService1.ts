import Datastore, { Extractor } from '@ulixee/datastore';

const datastore = new Datastore({
  extractors: {
    streamer: new Extractor(async ctx => {
      for (let i = 0; i < 3; i += 1) {
        ctx.Output.emit({ record: i });
      }
    }),
  },
});

export default datastore;
