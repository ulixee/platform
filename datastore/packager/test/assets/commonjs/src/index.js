const { Runner, HeroRunnerPlugin } = require('@ulixee/datastore-plugins-hero');
const { testRunner } = require('./helper');

module.exports = new Runner(
  {
    async run(ctx) {
      const { Output } = ctx;
      Output.emit({ text: testRunner() });
    },
  },
  HeroRunnerPlugin,
);
