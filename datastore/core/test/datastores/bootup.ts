import { boolean } from '@ulixee/schema';
import Datastore, { Runner } from '@ulixee/datastore';

module.exports = new Datastore({
  domain: 'bootup-datastore.com',
  runners: {
    bootup: new Runner({
      run({ Output }) {
        const output = new Output();
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
