// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable jest/no-jasmine-globals */
// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable jest/no-export */
import { Parser, Grammar } from 'nearley';
import grammar from '../syntax/compiled/main';
import { trimNullish } from '../lib/utils';
import { IExpr, ISelectStatement, IStatement, IInsertStatement, IUpdateStatement, IDeleteStatement, ISelectedColumn, IInterval, IBinaryOperator, IExprBinary, IName, IExprInteger, FromTable, IQName } from '../interfaces/ISqlNode';
import { astMapper, IAstMapper } from '../lib/astMapper';
import { toSql, IAstToSql } from '../lib/toSql';
import { parseIntervalLiteral } from '../lib/parser';
import { normalizeInterval } from '../lib/helpers/IntervalUtils';
import { tracking } from '../lib/helpers/lexer';

export function checkSelect(value: string | string[], expected: ISelectStatement) {
  checkTree(value, expected, (p, m) => m.statement(p));
}

export function checkInsert(value: string | string[], expected: IInsertStatement) {
  checkTree(value, expected, (p, m) => m.statement(p));
}
export function checkInsertLoc(value: string | string[], expected: IInsertStatement) {
  checkTree(value, expected, (p, m) => m.statement(p), undefined, true);
}
export function checkDelete(value: string | string[], expected: IDeleteStatement) {
  checkTree(value, expected, (p, m) => m.statement(p));
}

export function checkUpdate(value: string | string[], expected: IUpdateStatement) {
  checkTree(value, expected, (p, m) => m.statement(p));
}

export function checkStatement(value: string | string[], expected: IStatement) {
  checkTree(value, expected, (p, m) => m.statement(p));
}

function hideLocs(val: any): any {
  if (!val) {
    return val;
  }
  if (typeof val !== 'object') {
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(hideLocs);
  }
  const ret = {} as any;
  for (const [k, v] of Object.entries(val)) {
    ret[k] = hideLocs(v);
  }
  delete ret._location;
  return ret;
}

function deepEqual<T>(a: T, b: T, strict?: boolean, depth = 10, numberDelta = 0.0001) {
  if (depth < 0) {
    throw new Error('Comparing too deep entities');
  }

  if (a === b) {
    return true;
  }
  if (!strict) {
    // should not use '==' because it could call .toString() on objects when compared to strings.
    // ... which is not ok. Especially when working with translatable objects, which .toString() returns a transaltion (a string, thus)
    if (!a && !b) {
      return true;
    }
  }

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length)
      return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i], strict, depth - 1, numberDelta))
        return false;
    }
    return true;
  }

  // handle dates
  if (a instanceof Date || b instanceof Date) {
    return a === b;
  }

  const fa = Number.isFinite(<any>a);
  const fb = Number.isFinite(<any>b);
  if (fa || fb) {
    return fa && fb && Math.abs(<any>a - <any>b) <= numberDelta;
  }

  // handle plain objects
  if (typeof a !== 'object' || typeof a !== typeof b)
    return false;
  if (!a || !b) {
    return false;
  }

  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (strict && ak.length !== bk.length)
    return false;
  const set: Iterable<string> = strict
    ? Object.keys(a)
    : new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of set) {
    if (!deepEqual((a as any)[k], (b as any)[k], strict, depth - 1, numberDelta))
      return false;
  }
  return true;
}

function inspect(elt: any) {
  return require('util').inspect(elt);
}

function checkTree<T>(value: string | string[], expected: T, mapper: (parsed: T, m: IAstMapper | IAstToSql) => any, start?: string, checkLocations?: boolean) {
  if (typeof value === 'string') {
    value = [value];
  }
  for (const sql of value) {
    // eslint-disable-next-line @typescript-eslint/no-loop-func
    it(`parses ${sql}`, () => {
      const gram = Grammar.fromCompiled(grammar);
      if (start) {
        gram.start = start
      }
      function doParse(psql: string) {
        const parser = new Parser(gram);
        parser.feed(psql);
        const ret = parser.finish();
        if (!ret.length) {
          fail('Unexpected end of input');
        }
        if (ret.length !== 1) {
          const noLocs = ret.map(hideLocs);
          if (noLocs.slice(1).every(p => deepEqual(p, noLocs[0]))) {
            fail(`${noLocs.length} ambiguous syntaxes, but they yielded the same ASTs : ${  inspect(noLocs[0])}`);
          } else {
            fail(`${noLocs.length} ambiguous syntaxes, AND THEY HAVE YIELDED DIFFERENT ASTs : \n${  noLocs
              .map(inspect)
              .join('\n\n           ======================      \n\n')}`);
          }
        }
        return trimNullish(ret[0]);
      }
      const parsedWithLocations = tracking(() => doParse(sql));
      const parsedWithoutTracking = doParse(sql);
      const parsed =
        checkLocations
          ? parsedWithLocations
          : parsedWithoutTracking;

      // check that it is the AST we expected
      expect(parsed).toEqual(expected);

      // check that top-level statements always have at least some kind of basic position
      expect(parsedWithLocations._location).toBeTruthy();

      // check that it generates the same with/without location tracking
      expect(hideLocs(parsedWithLocations)).toEqual(hideLocs(parsedWithoutTracking));

      // check that it is stable through ast modifier
      const modified = mapper(parsed, astMapper(() => ({})));
      expect(modified).toEqual(parsed);


      // check that it procuces sql
      let newSql: string;
      try {
        newSql = mapper(parsed, toSql);
        expect(newSql).toEqual(expect.any(String));
      } catch (e) {
        (e as any).message = `⛔ ⛔ ⛔ ⛔ ⛔ ⛔ ⛔ ⛔ ⛔
        Failed to generate SQL from the parsed AST
            => There should be something wrong in toSql.ts
⛔ ⛔ ⛔ ⛔ ⛔ ⛔ ⛔ ⛔ ⛔
            ${(e as any).message}`;
        throw e;
      }

      // reparse the generated sql...
      let reparsed: any;
      try {
        expect(typeof newSql).toBe('string');
        reparsed = checkLocations
          ? tracking(() => doParse(newSql))
          : doParse(newSql);
      } catch (e) {
        (e as any).message = `⛔ ⛔ ⛔ ⛔ ⛔ ⛔ ⛔ ⛔ ⛔
        The parsed AST converted-back to SQL generated invalid SQL.
            => There should be something wrong in toSql.ts
⛔ ⛔ ⛔ ⛔ ⛔ ⛔ ⛔ ⛔ ⛔
            ${(e as any).message}`;
        throw e;
      }

      // ...and check it still produces the same ast.
      expect(hideLocs(reparsed)).toEqual(hideLocs(expected));
    });
  }
}

export function checkInvalid(sql: string, start?: string) {
  it(`does not parses ${sql}`, () => {
    const gram = Grammar.fromCompiled(grammar);
    if (start) {
      gram.start = start
    }
    const parser = new Parser(gram);
    parser.feed(sql);
    expect(parser.results).not.toEqual([]);
  });
}


export function checkValid(sql: string, start?: string) {
  it(`parses ${sql}`, () => {
    const gram = Grammar.fromCompiled(grammar);
    if (start) {
      gram.start = start
    }
    const parser = new Parser(gram);
    parser.feed(sql);
    expect(parser.results).not.toEqual([]);
  });
}


export function checkInvalidExpr(sql: string) {
  return checkInvalid(sql, 'expr');
}

export function checkTreeExpr(value: string | string[], expected: IExpr) {
  checkTree(value, expected, (p, m) => m.expr(p), 'expr');
}

export function checkTreeExprLoc(value: string | string[], expected: IExpr) {
  checkTree(value, expected, (p, m) => m.expr(p), 'expr', true);
}

export function columns(...vals: (IExpr | string)[]): ISelectedColumn[] {
  return vals.map<ISelectedColumn>(expr => typeof expr === 'string'
    ? { expr: { type: 'ref', name: expr } }
    : { expr });
}

export function checkInterval(input: string | string[], expected: IInterval) {
  for (const v of Array.isArray(input) ? input : [input]) {
    it(`parses interval "${v}"`, () => {
      expect(normalizeInterval(parseIntervalLiteral(v))).toEqual(expected);
    })
  }
}

export const star: IExpr = { type: 'ref', name: '*' };
export const starCol: ISelectedColumn = { expr: star };
export function col(n: string, alias?: string): ISelectedColumn {
  return {
    expr: ref(n),
    ...alias ? { name: alias } : undefined,
  };
}
export function ref(n: string): IExpr {
  return { type: 'ref', name: n };
}
export function binary(left: IExpr, op: IBinaryOperator, right: IExpr): IExprBinary {
  return { type: 'binary', left, op, right };
}
export function name(n: string): IName {
  return { name: n };
}
export function qname(n: string, schema?: string): IQName {
  return { name: n, schema };
}
export function int(value: number): IExprInteger {
  return { type: 'integer', value };
}
export function tbl(nm: string): FromTable {
  return {
    type: 'table',
    name: name(nm),
  };
}
