const { Table } = require('@ulixee/databox');
const Databox = require('@ulixee/databox');
const { Function } = require('@ulixee/databox');
const { boolean, string } = require('@ulixee/schema');

exports.default = new Databox({
  functions: {
    test: new Function({
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
