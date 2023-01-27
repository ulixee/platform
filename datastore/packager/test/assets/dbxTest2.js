const { Table } = require('@ulixee/datastore');
const Datastore = require('@ulixee/datastore');
const { Runner } = require('@ulixee/datastore');
const { boolean, string } = require('@ulixee/schema');

exports.default = new Datastore({
  runners: {
    test: new Runner({
      run(ctx) {
        ctx.output = { 
          testerEcho: ctx.input.shouldTest,
          greeting: 'Hello world',
        };
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
        isTester: boolean(),
      },
      seedlings: [
        { firstName: 'Caleb', lastName: 'Clark', isTester: true },
        { firstName: 'Blake', lastName: 'Byrnes' }
      ]
    }),
  }
});
