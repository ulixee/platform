const Datastore = require('@ulixee/datastore');
const { Function, HeroFunctionPlugin } = require('@ulixee/datastore-plugins-hero');

exports.default = new Datastore({
  functions: {
    default: new Function(() => null, HeroFunctionPlugin),
  },
});
