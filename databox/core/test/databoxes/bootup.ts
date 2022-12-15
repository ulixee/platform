import { boolean } from '@ulixee/schema';
import Databox, { Function } from '@ulixee/databox';

module.exports = new Databox({
  functions: {
    bootup: new Function({
      run({ output }) {
        output.success = true;
      },
      schema: {
        output: {
          'is-valid': boolean({ optional: true }),
          success: boolean(),
        },
      },
    }),
  },
});
