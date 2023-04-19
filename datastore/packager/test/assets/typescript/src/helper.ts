import isArray from 'lodash-es/isArray';

function testExtractor(): string {
  return isArray([]) ? 'true' : 'not an array';
}

export { testExtractor };
