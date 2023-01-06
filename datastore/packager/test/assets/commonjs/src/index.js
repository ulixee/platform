const { Function, HeroFunctionPlugin } = require('@ulixee/datastore-plugins-hero');
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
