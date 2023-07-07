const { Table } = require('@ulixee/datastore');
const Datastore = require('@ulixee/datastore');
const { Extractor } = require('@ulixee/datastore');
const { boolean, string } = require('@ulixee/schema');

exports.default = new Datastore({
  datastoreId:'dbx1q075ezwjzz9kxxn2vdaeju5t5y3n7krzrqdk4u6g74dhl7un2hescjl5vu',
  version:'0.0.1',
  extractors: {
    test: new Extractor({
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
