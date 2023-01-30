import isArray from 'lodash-es/isArray';

function testRunner() {
  return isArray([]) ? 'true' : 'not an array';
}

export { testRunner };
