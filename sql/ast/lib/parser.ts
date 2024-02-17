import { Grammar, Parser } from 'nearley';
import IParseOptions from '../interfaces/IParseOptions';
import {
  IBox,
  ICircle,
  IExpr,
  IGeometricLiteral,
  IInterval,
  ILine,
  IPath,
  IPoint,
  IPolygon,
  IQName,
  ISegment,
  ISqlComment,
  IStatement,
} from '../interfaces/ISqlNode';
import arrayGrammar from '../syntax/compiled/literals/array';
import geometricGrammar from '../syntax/compiled/literals/geometric';
import intervalTextGrammar from '../syntax/compiled/literals/interval';
import intervalIsoGrammar from '../syntax/compiled/literals/interval-iso';
import sqlGrammar from '../syntax/compiled/main';
import { buildInterval } from './helpers/IntervalUtils';
import { tracking, trackingComments } from './helpers/lexer';

let sqlCompiled: Grammar;
let arrayCompiled: Grammar;
let geometricCompiled: Grammar;
let intervalTextCompiled: Grammar;
let intervalIsoCompiled: Grammar;

/** Parse the first SQL statement in the given text (discards the rest), and return its AST */
export function parseFirst(sql: string): IStatement {
  const first = parse(sql);
  return first[0];
}

/** Parse an AST from SQL, and get the comments */
export function parseWithComments(sql: string, options?: IParseOptions): { ast: IStatement[]; comments: ISqlComment[] } {
  return trackingComments(() => parse(sql, options));
}

/** Parse an AST from SQL */
export function parse(sql: string): IStatement[];
export function parse(sql: string, entry: 'expr'): IExpr;
export function parse(sql: string, entry: 'qualified_name'): IQName;
export function parse(sql: string, options?: IParseOptions): IStatement[];
export function parse(sql: string, optEntry?: string | IParseOptions): any {
  if (!sqlCompiled) {
    sqlCompiled = Grammar.fromCompiled(sqlGrammar);
  }

  const entry = typeof optEntry === 'string'
    ? optEntry
    : optEntry?.entry;
  const opts = typeof optEntry === 'string' ? null : optEntry;


  // parse sql
  const doParse = (): any => _parse(sql, sqlCompiled, entry);
  let parsed = opts?.locationTracking
    ? tracking(doParse)
    : doParse();

  // always return an array of statements.
  if (typeof optEntry !== 'string' && !Array.isArray(parsed)) {
    parsed = [parsed];
  }
  return parsed;
}

export function parseArrayLiteral(sql: string): string[] {
  if (!arrayCompiled) {
    arrayCompiled = Grammar.fromCompiled(arrayGrammar);
  }
  return _parse(sql, arrayCompiled);
}

export function parseIntervalLiteral(literal: string): IInterval {
  if (literal.startsWith('P')) {
    if (!intervalIsoCompiled) {
      intervalIsoCompiled = Grammar.fromCompiled(intervalIsoGrammar);
    }
    return buildInterval(literal, _parse(literal, intervalIsoCompiled));
  }
  if (!intervalTextCompiled) {
    intervalTextCompiled = Grammar.fromCompiled(intervalTextGrammar);
  }
  const low = literal.toLowerCase(); // full text syntax is case insensitive
  return buildInterval(literal, _parse(low, intervalTextCompiled));
}

export function parseGeometricLiteral(sql: string, type: 'point'): IPoint;
export function parseGeometricLiteral(sql: string, type: 'line'): ILine;
export function parseGeometricLiteral(sql: string, type: 'lseg'): ISegment;
export function parseGeometricLiteral(sql: string, type: 'box'): IBox;
export function parseGeometricLiteral(sql: string, type: 'path'): IPath;
export function parseGeometricLiteral(sql: string, type: 'polygon'): IPolygon;
export function parseGeometricLiteral(sql: string, type: 'circle'): ICircle;
export function parseGeometricLiteral(sql: string, type: 'point' | 'line' | 'lseg' | 'box' | 'path' | 'polygon' | 'circle'): IGeometricLiteral {
  if (!geometricCompiled) {
    geometricCompiled = Grammar.fromCompiled(geometricGrammar);
  }
  return _parse(sql, geometricCompiled, type);
}

// eslint-disable-next-line @typescript-eslint/naming-convention
function _parse(sql: string, grammar: Grammar, entry?: string): any {
  try {
    grammar.start = entry ?? 'main';
    const parser = new Parser(grammar);
    parser.feed(sql);
    const asts = parser.finish();
    if (!asts.length) {
      throw new Error('Unexpected end of input');
    } else if (asts.length !== 1) {
      throw new Error(`💀 Ambiguous SQL syntax: Please file an issue stating the request that has failed at https://github.com/oguimbal/pgsql-ast-parser:

        ${sql}

        `);
    }
    return asts[0];
  } catch (e) {
    if (typeof (e as any)?.message !== 'string') {
      throw e;
    }
    let msg: string = (e as any).message;
    // remove all the stack crap of nearley parser
    let begin: string | null = null;
    const parts: string[] = [];
    const reg = /A (.+) token based on:/g;
    let m: RegExpExecArray | null;
    // eslint-disable-next-line no-cond-assign
    while (m = reg.exec(msg)) {
      begin = begin ?? msg.substr(0, m.index);
      parts.push(`    - A "${m[1]}" token`);
    }
    if (begin) {
      msg = `${begin}${parts.join('\n')}\n\n`;
    }
    (e as any).message = msg;
    throw e;
  }
}
