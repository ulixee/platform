const Datastore = require('@ulixee/datastore');
const { Runner, HeroRunnerPlugin } = require('@ulixee/datastore-plugins-hero');

exports.default = new Datastore({
  runners: {
    default: new Runner(() => null, HeroRunnerPlugin),
  },
});
