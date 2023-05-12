import { compile, keywords, Token } from 'moo';
import { sqlKeywords } from './keywords';
import { INodeLocation, ISqlComment } from '../../interfaces/ISqlNode';

// build keywords
const keywordsMap: any = {};
for (const k of sqlKeywords) {
  keywordsMap[`kw_${k.toLowerCase()}`] = k;
}

function caseInsensitiveKeywords(map: any): (text: string) => string {
  const transform = keywords(map);
  return (text: string) => transform(text.toUpperCase());
}

// build lexer
export const lexer = compile({
  word: {
    match: /[eE](?!')[A-Za-z0-9_]*|[a-df-zA-DF-Z_][A-Za-z0-9_]*/,
    type: caseInsensitiveKeywords(keywordsMap),
    value: x => keywordsMap[`kw_${x.toLowerCase}`] ? x.toLowerCase() : x,
  },
  wordQuoted: {
    match: /"(?:[^"*]|"")+"/,
    type: () => 'quoted_word',
    value: x => x.substring(1, x.length - 1),
  },
  string: {
    match: /'(?:[^']|'')*'/,
    value: x => {
      return x.substring(1, x.length - 1)
        .replace(/''/g, '\'');
    },
  },
  eString: {
    match: /\b(?:e|E)'(?:[^'\\]|[\r\n\s]|(?:\\\s)|(?:\\\n)|(?:\\.)|(?:''))+'/,
    value: x => {
      return x.substring(2, x.length - 1)
        .replace(/''/g, '\'')
        .replace(/\\([\s\n])/g, (_, y) => y)
        .replace(/\\./g, m => JSON.parse(`"${m}"`));
    },
  },
  qparam: {
    match: /\$\d+/,
  },
  commentLine: /--.*?$[\s\r\n]*/,
  commentFullOpen: /\/\*/,
  commentFullClose: /\*\/[\s\r\n]*/,
  star: '*',
  comma: ',',
  space: { match: /[\s\t\n\v\f\r]+/, lineBreaks: true, },
  int: /-?\d+(?![.\d])/,
  float: /-?(?:(?:\d*\.\d+)|(?:\d+\.\d*))/,
  // word: /[a-zA-Z][A-Za-z0-9_\-]*/,
  lparen: '(',
  rparen: ')',
  lbracket: '[',
  rbracket: ']',
  semicolon: ';',
  dot: /\.(?!\d)/,
  op_cast: '::',
  op_colon: ':',
  op_plus: '+',
  op_assignment: '=>',
  op_eq: '=',
  op_neq: {
    match: /(?:!=)|(?:<>)/,
    value: () => '!=',
  },
  op_membertext: '->>',
  op_member: '->',
  op_minus: '-',
  op_div: /\//,
  op_not_ilike: /!~~\*/, // !~~* =ILIKE
  op_not_like: /!~~/, // !~~ =LIKE
  op_ilike: /~~\*/, // ~~* =ILIKE
  op_like: /~~/, // ~~ =LIKE
  op_mod: '%',
  op_exp: '^',
  op_additive: {
    // group other additive operators
    match: ['||', '-', '#-', '&&'],
  },
  op_compare: {
    // group other comparison operators
    // ... to add: "IN" and "NOT IN" that are matched by keywords
    match: ['>', '>=', '<', '<=', '@>', '<@', '?', '?|', '?&', '#>>', '>>', '<<', '~', '~*', '!~', '!~*'],
  },
  ops_others: {
    // referenced as (any other operator) in https://www.postgresql.org/docs/12/sql-syntax-lexical.html#SQL-PRECEDENCE
    // see also https://www.postgresql.org/docs/9.0/functions-math.html
    match: ['|', '&', '^', '#'],
  },
  codeblock: {
    match: /\$\$(?:.|[\s\t\n\v\f\r])*?\$\$/s,
    lineBreaks: true,
    value: (x: string) => x.substring(2, x.length - 2),
  },
});

lexer.next = (next => () => {
  let tok: Token | undefined;
  let commentFull: {
    nested: number;
    offset: number;
    text: string;
  } | null = null;

  // eslint-disable-next-line no-cond-assign
  while (tok = next.call(lexer)) {
    // js regex can't be recursive, so we'll keep track of nested opens (/*) and closes (*/).
    if (tok.type === 'commentFullOpen') {
      if (commentFull === null) { // initial open - start collecting content
        commentFull = {
          nested: 0,
          offset: tok.offset,
          text: tok.text
        };
        continue;
      }
      commentFull.nested++;
    }
    if (commentFull != null) {
      // collect comment content
      commentFull.text += tok.text;

      if (tok.type === 'commentFullClose') {
        if (commentFull.nested === 0) { // finish comment, if not nested
          comments?.push(makeComment(commentFull));
          commentFull = null;
          continue;
        }
        commentFull.nested--;
      }
      continue;
    }
    if (tok.type === 'space') {
      continue;
    }
    if (tok.type === 'commentLine') {
      comments?.push(makeComment(tok));
      continue;
    }
    break;
  }

  if (trackingLoc && tok) {
    const start = tok.offset;
    const loc: INodeLocation = {
      start,
      end: start + tok.text.length,
    };
    (tok as any)._location = loc;
  }
  return tok;
})(lexer.next);

export const lexerAny: any = lexer;

let comments: ISqlComment[] | null = null;

const makeComment = ({ offset, text }: { offset: number; text: string }): ISqlComment => ({
  _location: { start: offset, end: offset + text.length },
  comment: text,
});

export function trackingComments<T>(act: () => T): { ast: T; comments: ISqlComment[] } {
  if (comments) {
    throw new Error('WAT ? Recursive comments tracking 🤔🤨 ?');
  }
  try {
    comments = [];
    const ast = act();
    return { comments, ast };
  } finally {
    comments = null;
  }
}

let trackingLoc = false;
export function tracking<T>(act: () => T): T {
  if (trackingLoc) {
    return act();
  }
  try {
    trackingLoc = true;
    return act();
  } finally {
    trackingLoc = false;
  }
}

export function track(xs: any, ret: any): any {
  if (!trackingLoc || !ret || typeof ret !== 'object') {
    return ret;
  }
  const start = seek(xs, true);
  const end = seek(xs, false);
  if (!start || !end) {
    return ret;
  }
  if (start === end) {
    ret._location = start;
  } else {
    const loc: INodeLocation = {
      start: start.start,
      end: end.end,
    };
    ret._location = loc;
  }

  return ret;
}

const literal = Symbol('_literal');
const doubleQuotedSym = Symbol('_doublequoted');
export function box(xs: any, value: any, dqSymbol?: boolean): any {
  if (!trackingLoc && !dqSymbol) {
    return value;
  }
  return track(xs, { [literal]: value, [doubleQuotedSym]: dqSymbol });
}


function unwrapNoBox(e: any[]): any {
  if (Array.isArray(e) && e.length === 1) {
    e = unwrapNoBox(e[0]);
  }
  if (Array.isArray(e) && !e.length) {
    return null;
  }
  return e;
}

export function doubleQuoted(value: any): { doubleQuoted: boolean } | undefined {
  const uw = unwrapNoBox(value);
  if (typeof value === 'object' && uw?.[doubleQuotedSym]) {
    return { doubleQuoted: true };
  }
  return undefined;
}

export function unbox(value: any): any {
  if (typeof value === 'object') {
    return value?.[literal] ?? value;
  }
  return value;
}

function seek(xs: any, start: boolean): INodeLocation | null {
  if (!xs) {
    return null;
  }
  if (Array.isArray(xs)) {
    const diff = start ? 1 : -1;
    for (let i = start ? 0 : xs.length - 1; i >= 0 && i < xs.length; i += diff) {
      const v = seek(xs[i], start);
      if (v) {
        return v;
      }
    }
    return null;
  }
  if (typeof xs !== 'object') {
    return null;
  }
  return xs._location;
}
