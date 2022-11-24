// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable jest/expect-expect */
import { Token } from 'moo';
import { lexer } from '../../syntax/raw/literals/array-lexer';
import { parseArrayLiteral } from '../../lib/parser';
import { Optional } from '../../lib/utils';

describe('Array literals', () => {

  const hasContent = [
    /^value$/,
  ]
  function next(expected: any) {
    const result = lexer.next() as Optional<Token>;
    delete result.toString;
    delete result.col;
    delete result.line;
    delete result.lineBreaks;
    delete result.offset;
    delete result.text;
    if (!hasContent.some(x => x.test(result.type))) {
      delete result.value;
    }
    expect(result).toEqual(expected);
  }

  it('Lexer: tokenizes simple list', () => {
    lexer.reset(`{  a b , " a b " , "a\\" b"}`);
    next({ type: 'start_list' });
    next({ type: 'value', value: 'a b' });
    next({ type: 'comma' });
    next({ type: 'value', value: ' a b ' });
    next({ type: 'comma' });
    next({ type: 'value', value: 'a" b' });
    next({ type: 'end_list' });
  });

  it('parses single array', () => {
    expect(parseArrayLiteral('{a}')).toEqual(['a'])
  })

  it('parses double array', () => {
    expect(parseArrayLiteral('{a, b}')).toEqual(['a', 'b'])
  })


  it('parses empty array', () => {
    expect(parseArrayLiteral('{}')).toEqual([]);
  })

  it('parses two dimensions', () => {
    expect(parseArrayLiteral('{{a}, {b, c}}')).toEqual([['a'], ['b', 'c']])
  })
});