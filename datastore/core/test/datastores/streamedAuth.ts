import Datastore, { Extractor } from '@ulixee/datastore';

const allowedId = 'id1TOFILLIN';

export default new Datastore({
  id: 'streamed-auth',
  version: '0.0.1',
  authenticateIdentity(identity) {
    return identity === allowedId;
  },
  extractors: {
    authme: new Extractor({
      run(ctx) {
        ctx.Output.emit({ youreIn: true });
      },
    }),
  },
});
