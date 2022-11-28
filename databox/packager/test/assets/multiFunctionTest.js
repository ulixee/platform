const Databox = require('@ulixee/databox');
const { Function, HeroFunctionPlugin } = require('@ulixee/databox-plugins-hero');
const { string } = require('@ulixee/schema');

exports.default = new Databox({
  functions: {
    funcWithInput: new Function(
      {
        schema: {
          input: {
            url: string({ format: 'url' }),
          },
        },
        async run({ input, hero }) {
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
      async run({ output }) {
        output.html = '<body></body>';
        output.title = 'This is the title';
      },
    }),
  },
});
