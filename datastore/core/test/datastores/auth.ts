import Datastore, { Runner } from '@ulixee/datastore';

const allowedId = 'id1TOFILLIN';

export default new Datastore({
  authenticateIdentity(identity) {
    return identity === allowedId;
  },
  runners: {
    authme: new Runner({
      run(ctx) {
        ctx.Output.emit({ youreIn: true });
      },
    }),
  },
});
