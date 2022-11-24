
@lexer lexerAny
@include "base.ne"
@include "expr.ne"


array_of[EXP] -> $EXP (%comma $EXP {% last %}):* {% ([head, tail]) => {
    return [unwrap(head), ...(tail.map(unwrap) || [])];
} %}

# https://www.postgresql.org/docs/13/sql-comment.html
comment_statement -> kw_comment %kw_on comment_what %kw_is string {% x => track(x, {
        type: 'comment',
        comment: unbox(last(x)),
        on: unwrap(x[2]),
    }) %}

comment_what -> comment_what_col | comment_what_nm

comment_what_nm -> (%kw_table
                    | kw_view
                    | %word {% anyKw('database', 'index', 'trigger', 'type', 'view') %})
                qualified_name {% x => track(x, {
                    type: toStr(x[0]),
                    name: x[1],
                }) %}

comment_what_col -> kw_column qcolumn {% x => track(x, {
                type: 'column',
                column: last(x),
            }) %}

