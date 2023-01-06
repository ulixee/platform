const { Function, HeroFunctionPlugin } = require('@ulixee/databox-plugins-hero');
const { testFunction } = require('./helper');

module.exports = new Function(
  {
    async run(ctx) {
      const { Output } = ctx;
      Output.emit({ text: testFunction() });
    },
  },
  HeroFunctionPlugin,
);
