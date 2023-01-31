import Datastore, { Table, Runner } from '@ulixee/datastore';
import { bigint, boolean, string } from '@ulixee/schema';

export default new Datastore({
  runners: {
    test: new Runner({
      run(ctx) {
        ctx.Output.emit({
          testerEcho: ctx.input.shouldTest,
          lastName: 'Clark',
          greeting: 'Hello world',
        });
      },
      schema: {
        input: {
          shouldTest: boolean(),
        },
        output: {
          testerEcho: boolean(),
          lastName: string(),
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
        testerNumber: bigint({ optional: true }),
      },
      seedlings: [
        { firstName: 'Caleb', lastName: 'Clark', testerNumber: 1n },
        { firstName: 'Blake', lastName: 'Byrnes' },
      ],
    }),
  },
});
