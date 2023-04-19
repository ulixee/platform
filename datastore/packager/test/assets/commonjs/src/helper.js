const isArray = require('lodash-es/isArray');

module.exports.testExtractor = function testExtractor() {
  return isArray([]) ? 'true' : 'not an array';
};
