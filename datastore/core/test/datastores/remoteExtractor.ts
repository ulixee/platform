import Datastore, { Extractor } from '@ulixee/datastore';
import { boolean, string } from '@ulixee/schema';

export default new Datastore({
  id: 'remote-extractor',
  version: '0.0.1',
  extractors: {
    remote: new Extractor({
      run(ctx) {
        new ctx.Output({ iAmRemote: true, echo: ctx.input.test });
      },
      schema: {
        input: {
          test: string(),
        },
        output: {
          iAmRemote: boolean(),
          echo: string(),
        },
      },
    }),
  },
});
