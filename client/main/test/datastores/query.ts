import Datastore, { Table, Function } from '@ulixee/datastore';
import { boolean, string } from '@ulixee/schema';

export default new Datastore({
  functions: {
    test: new Function({
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
        isTester: boolean(),
      },
      seedlings: [
        { firstName: 'Caleb', lastName: 'Clark', isTester: true },
        { firstName: 'Blake', lastName: 'Byrnes' },
      ],
    }),
  },
});