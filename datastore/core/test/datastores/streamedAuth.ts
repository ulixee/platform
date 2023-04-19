import Datastore, { Extractor } from '@ulixee/datastore';

const allowedId = 'id1TOFILLIN';

export default new Datastore({
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
