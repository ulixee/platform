import isArray from 'lodash-es/isArray';

function testRunner(): string {
  return isArray([]) ? 'true' : 'not an array';
}

export { testRunner };
