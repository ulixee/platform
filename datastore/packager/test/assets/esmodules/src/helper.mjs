import isArray from 'lodash-es/isArray';

function testExtractor() {
  return isArray([]) ? 'true' : 'not an array';
}

export { testExtractor };
