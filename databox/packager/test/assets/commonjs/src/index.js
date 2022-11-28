const { Function, HeroFunctionPlugin } = require('@ulixee/databox-plugins-hero');
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
