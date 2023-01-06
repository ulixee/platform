import isArray from 'lodash-es/isArray';

function testFunction() {
  return isArray([]) ? 'true' : 'not an array';
}

export { testFunction };
