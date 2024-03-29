import { compile } from 'moo';

// build lexer
export const lexer = compile({
  valueString: {
    match: /"(?:\\["\\]|[^\n"\\])*"/,
    value: x => JSON.parse(x),
    type: () => 'value',
  },
  valueRaw: {
    match: /[^\s,{}"](?:[^,{}"]*[^\s,{}"])?/,
    type: () => 'value',
  },
  comma: ',',
  space: { match: /[\s\t\n\v\f\r]+/, lineBreaks: true, },
  start_list: '{',
  end_list: '}',
});

lexer.next = (next => () => {
  let tok;
  // eslint-disable-next-line no-cond-assign
  while ((tok = next.call(lexer)) && (tok.type === 'space')) {
  }
  return tok;
})(lexer.next);

export const lexerAny: any = lexer;