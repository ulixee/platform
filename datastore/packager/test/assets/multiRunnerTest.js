const Datastore = require('@ulixee/datastore');
const { Runner, HeroRunnerPlugin } = require('@ulixee/datastore-plugins-hero');
const { string } = require('@ulixee/schema');

exports.default = new Datastore({
  runners: {
    runnerWithInput: new Runner(
      {
        schema: {
          input: {
            url: string({ format: 'url' }),
          },
        },
        async run({ input, Hero }) {
          const hero = new Hero();
          await hero.goto(input.url);
        },
      },
      HeroRunnerPlugin,
    ),
    runnerWithOutput: new Runner({
      schema: {
        output: {
          title: string(),
          html: string(),
        },
      },
      async run({ Output }) {
        Output.emit({
          html: '<body></body>',
          title: 'This is the title',
        });
      },
    }),
  },
});
