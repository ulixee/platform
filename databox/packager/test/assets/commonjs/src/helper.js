const isArray = require('lodash-es/isArray');

module.exports.testFunction = function testFunction() {
  return isArray([]) ? 'true' : 'not an array';
};
