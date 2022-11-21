const Databox = require('@ulixee/databox');
const { Function, HeroFunctionPlugin } = require('@ulixee/databox-plugins-hero');

exports.default = new Databox({
  functions: {
    default: new Function(() => null, HeroFunctionPlugin),
  },
});
