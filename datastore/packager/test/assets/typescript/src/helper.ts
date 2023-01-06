import isArray from 'lodash-es/isArray';

function testFunction(): string {
  return isArray([]) ? 'true' : 'not an array';
}

export { testFunction };
