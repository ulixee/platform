@preprocessor typescript

@{%
const { lexerAny } = require('../../lib/helpers/lexer');
%}
@lexer lexerAny
@include "base.ne"
@include "expr.ne"
@include "select.ne"
@include "simple-statements.ne"
@include "insert.ne"
@include "update.ne"
@include "delete.ne"

# list of statements, separated by ";"
main -> statement_separator:* statement (statement_separator:+ statement):* statement_separator:*  {% ([_, head, _tail]) => {
    const tail = _tail;

    const ret = [unwrap(head), ...tail.map((x: any) => unwrap(x[1]))];

    return ret.length === 1
        ? ret[0]
        : ret;
} %}

statement_separator -> %semicolon


statement -> statement_noprep

statement_noprep
    -> selection_statement
    | insert_statement
    | update_statement
    | delete_statement
    | comment_statement
