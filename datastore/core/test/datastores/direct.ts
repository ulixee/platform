import Datastore, { Extractor, Table } from '@ulixee/datastore';
import { boolean, string } from '@ulixee/schema';

export default new Datastore({
  id: 'direct',
  version: '0.0.1',
  extractors: {
    test: new Extractor({
      run(ctx) {
        new ctx.Output({
          testerEcho: ctx.input.shouldTest,
          greeting: 'Hello world',
        });
      },
      schema: {
        input: {
          shouldTest: boolean(),
        },
        output: {
          testerEcho: boolean(),
          greeting: string(),
        },
      },
    }),
  },
  tables: {
    testers: new Table({
      schema: {
        firstName: string(),
        lastName: string(),
        isTester: boolean({ optional: true }),
      },
      onCreated(): Promise<void> {
        return this.insertInternal(
          { firstName: 'Caleb', lastName: 'Clark', isTester: true },
          { firstName: 'Blake', lastName: 'Byrnes' },
        );
      },
    }),
  },
});
