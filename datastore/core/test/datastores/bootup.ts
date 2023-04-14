import { boolean } from '@ulixee/schema';
import Datastore, { Extractor } from '@ulixee/datastore';

module.exports = new Datastore({
  domain: 'bootup-datastore.com',
  extractors: {
    bootup: new Extractor({
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
