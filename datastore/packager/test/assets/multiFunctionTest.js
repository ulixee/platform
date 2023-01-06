const Datastore = require('@ulixee/datastore');
const { Function, HeroFunctionPlugin } = require('@ulixee/datastore-plugins-hero');
const { string } = require('@ulixee/schema');

exports.default = new Datastore({
  functions: {
    funcWithInput: new Function(
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
      HeroFunctionPlugin,
    ),
    funcWithOutput: new Function({
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
