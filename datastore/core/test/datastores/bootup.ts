import { boolean } from '@ulixee/schema';
import Datastore, { Extractor } from '@ulixee/datastore';

module.exports = new Datastore({
  id: 'bootup',
  version: '0.0.1',
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
