import { boolean } from '@ulixee/schema';

const Databox = require('@ulixee/databox');

module.exports = new Databox({
  functions: {
    bootup: {
      run({ output }) {
        output.success = true;
      },
      schema: {
        output: {
          'is-valid': boolean({ optional: true }),
          success: boolean(),
        },
      },
    },
  },
});
