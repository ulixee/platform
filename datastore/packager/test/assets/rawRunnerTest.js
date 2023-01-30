const { Runner, HeroRunnerPlugin } = require('@ulixee/datastore-plugins-hero');

exports.default = new Runner(({ Output }) => {
  Output.emit({ test: 1 });
}, HeroRunnerPlugin);
