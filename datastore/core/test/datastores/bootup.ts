import { boolean } from '@ulixee/schema';
import Datastore, { Function } from '@ulixee/datastore';

module.exports = new Datastore({
  domain: 'bootup-datastore.com',
  functions: {
    bootup: new Function({
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
