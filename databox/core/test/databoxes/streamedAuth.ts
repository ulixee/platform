import Databox, { Function } from '@ulixee/databox';

const allowedId = 'id1TOFILLIN';

export default new Databox({
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
