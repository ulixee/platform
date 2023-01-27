const isArray = require('lodash-es/isArray');

module.exports.testRunner = function testRunner() {
  return isArray([]) ? 'true' : 'not an array';
};
