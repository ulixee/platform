import Datastore, { Extractor } from '@ulixee/datastore';

const datastore = new Datastore({
  id: 'datastore-registry-service1',
  version: '0.0.1',
  extractors: {
    streamer: new Extractor(async ctx => {
      for (let i = 0; i < 3; i += 1) {
        ctx.Output.emit({ record: i });
      }
    }),
  },
});

export default datastore;
