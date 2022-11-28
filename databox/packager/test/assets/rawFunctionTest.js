const { Function, HeroFunctionPlugin } = require('@ulixee/databox-plugins-hero');

exports.default = new Function(({ output }) => {
  output.test = 1;
}, HeroFunctionPlugin);
