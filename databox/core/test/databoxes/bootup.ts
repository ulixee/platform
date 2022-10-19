import { boolean } from '@ulixee/schema';

const Databox = require('@ulixee/databox');

module.exports = new Databox({
  run(databox) {
    databox.output = { success: true };
  },
  schema: {
    output: {
      'is-valid': boolean({ optional: true }),
      success: boolean(),
    },
  },
});
