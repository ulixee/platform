// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable jest/expect-expect */
import { Token } from 'moo';
import { lexer } from '../../syntax/raw/literals/geometric-lexer';
import { parseGeometricLiteral } from '../../lib/parser';
import { Optional } from '../../lib/utils';
import { ISegment, IBox, ILine, IPoint } from '../../interfaces/ISqlNode';

describe('Geometric literals', () => {

  const hasContent = [
    /^int$/,
    /^float$/,
  ];
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

  it('Lexer: various tokens', () => {
    lexer.reset(`(12,)<>{}`);
    next({ type: 'lparen' });
    next({ type: 'int', value: '12' });
    next({ type: 'comma' });
    next({ type: 'rparen' });
    next({ type: 'lcomp' });
    next({ type: 'rcomp' });
    next({ type: 'lcurl' });
    next({ type: 'rcurl' });
  });

  it('Lexer: tokenizes comma', () => {
    lexer.reset('2,2');
    next({ type: 'int', value: '2' });
    next({ type: 'comma' });
    next({ type: 'int', value: '2' });
  });


  it('Lexer: tokenizes floats', () => {
    lexer.reset('1.,.1,-.1,-0.1,0.1,10.,-10.');
    next({ type: 'float', value: '1.' });
    next({ type: 'comma' });
    next({ type: 'float', value: '.1' });
    next({ type: 'comma' });
    next({ type: 'float', value: '-.1' });
    next({ type: 'comma' });
    next({ type: 'float', value: '-0.1' });
    next({ type: 'comma' });
    next({ type: 'float', value: '0.1' });
    next({ type: 'comma' });
    next({ type: 'float', value: '10.' });
    next({ type: 'comma' });
    next({ type: 'float', value: '-10.' });
  });

  it('parses point', () => {
    const point: IPoint = { x: 1, y: 2 };
    expect(parseGeometricLiteral('(1,2)', 'point')).toEqual(point);
    expect(parseGeometricLiteral('.1,2.', 'point')).toEqual({ x: .1, y: 2 });
    expect(parseGeometricLiteral(' 1.1 , .2 ', 'point')).toEqual({ x: 1.1, y: 0.2 });
  });


  it('parses line', () => {
    const line: ILine = { a: 1, b: 2, c: 3 };
    expect(parseGeometricLiteral('{1,2,3}', 'line')).toEqual(line);
  });

  it('parses box', () => {
    const box: IBox = [{ x: 1, y: 2 }, { x: 3, y: 4 }];
    expect(parseGeometricLiteral('((1,2),(3,4))', 'box')).toEqual(box);
    expect(parseGeometricLiteral('(1,2),(3,4)', 'box')).toEqual(box);
    expect(parseGeometricLiteral('(1,2,3,4)', 'box')).toEqual(box);
    expect(parseGeometricLiteral('1 , 2 , 3 , 4', 'box')).toEqual(box);
  });

  it('parses segment', () => {
    const lseg: ISegment = [{ x: 1, y: 2 }, { x: 3, y: 4 }];
    expect(parseGeometricLiteral('[(1,2),(3,4)]', 'lseg')).toEqual(lseg);
    expect(parseGeometricLiteral('((1,2),(3,4))', 'lseg')).toEqual(lseg);
    expect(parseGeometricLiteral('(1,2),(3,4)', 'lseg')).toEqual(lseg);
    expect(parseGeometricLiteral('(1,2,3,4)', 'lseg')).toEqual(lseg);
    expect(parseGeometricLiteral('1 , 2 , 3 , 4', 'lseg')).toEqual(lseg);
  });

  it('parses closed paths', () => {
    const path = { closed: true, path: [{ x: 1, y: 2 }, { x: 3, y: 4 }, { x: 5, y: 6 }] };
    expect(parseGeometricLiteral('((1,2),(3,4), (5,6))', 'path')).toEqual(path);
    expect(parseGeometricLiteral('(1,2),(3,4), 5,6', 'path')).toEqual(path);
    expect(parseGeometricLiteral('(1,2,3,4, (5,6))', 'path')).toEqual(path);
    expect(parseGeometricLiteral('1 , 2 , 3 , 4, (5,6)', 'path')).toEqual(path);
  });

  it('parses open paths', () => {
    const path = { closed: false, path: [{ x: 1, y: 2 }, { x: 3, y: 4 }, { x: 5, y: 6 }] };
    expect(parseGeometricLiteral('[(1,2),(3,4), (5,6)]', 'path')).toEqual(path);
    expect(parseGeometricLiteral('[(1,2),(3,4), 5,6]', 'path')).toEqual(path);
    expect(parseGeometricLiteral('[1,2,3,4, (5,6)]', 'path')).toEqual(path);
    expect(parseGeometricLiteral('[1 , 2 , 3 , 4, (5,6)]', 'path')).toEqual(path);
  });



  it('parses polygon', () => {
    const polygon = [{ x: 1, y: 2 }, { x: 3, y: 4 }, { x: 5, y: 6 }];
    expect(parseGeometricLiteral('((1,2),(3,4), (5,6))', 'polygon')).toEqual(polygon);
    expect(parseGeometricLiteral('(1,2),(3,4), 5,6', 'polygon')).toEqual(polygon);
    expect(parseGeometricLiteral('(1,2,3,4, (5,6))', 'polygon')).toEqual(polygon);
    expect(parseGeometricLiteral('1 , 2 , 3 , 4, (5,6)', 'polygon')).toEqual(polygon);
  });


  it('parses circle', () => {
    const circle = { c: { x: 1, y: 2 }, r: 3 };
    expect(parseGeometricLiteral('<(1,2),3>', 'circle')).toEqual(circle);
    expect(parseGeometricLiteral('((1,2),3)', 'circle')).toEqual(circle);
    expect(parseGeometricLiteral('(1,2),3', 'circle')).toEqual(circle);
    expect(parseGeometricLiteral('1,2,3', 'circle')).toEqual(circle);
  });
});