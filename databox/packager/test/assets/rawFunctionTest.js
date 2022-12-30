const { Function, HeroFunctionPlugin } = require('@ulixee/databox-plugins-hero');

exports.default = new Function(({ Output }) => {
  Output.emit({ test: 1 });
}, HeroFunctionPlugin);
