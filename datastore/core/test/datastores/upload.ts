import Datastore, { Extractor } from '@ulixee/datastore';
import { boolean } from '@ulixee/schema';

export default new Datastore({
  id: 'upload',
  extractors: {
    upTest: new Extractor({
      run(ctx) {
        ctx.Output.emit({ upload: true });
      },
      schema: {
        output: { upload: boolean({ description: 'Whether or not this test succeeded' }) },
      },
    }),
  },
});
