import Datastore, { Function } from '@ulixee/datastore';

const allowedId = 'id1TOFILLIN';

export default new Datastore({
  authenticateIdentity(identity) {
    return identity === allowedId;
  },
  functions: {
    authme: new Function({
      run(ctx) {
        ctx.Output.emit({ youreIn: true });
      },
    }),
  },
});
