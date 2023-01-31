import Datastore, { Table, Runner } from '@ulixee/datastore';
import { boolean, string } from '@ulixee/schema';

export default new Datastore({
  domain: 'docs.datastoresRus.com',
  runners: {
    test: new Runner({
      run(ctx) {
        ctx.Output.emit({
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
      seedlings: [
        { firstName: 'Caleb', lastName: 'Clark', isTester: true },
        { firstName: 'Blake', lastName: 'Byrnes' },
      ],
    }),
  },
});
