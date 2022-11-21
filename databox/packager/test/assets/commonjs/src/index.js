const { Function, HeroFunctionPlugin } = require('@ulixee/databox-for-hero');
const { testFunction } = require('./helper');

module.exports = new Function(
  {
    async run(ctx) {
      const { hero, output } = ctx;
      output.text = testFunction();
      await hero.close();
    },
  },
  HeroFunctionPlugin,
);
