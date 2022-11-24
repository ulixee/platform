@lexer lexerAny
@include "base.ne"
@include "expr.ne"
@include "select.ne"

insert_statement -> (kw_insert %kw_into)
                        table_ref_aliased
                    collist_paren:?
                    (kw_overriding (kw_system | %kw_user) kw_value {% get(1) %}):?
                    (selection_statement | selection_paren):?
                    (%kw_returning select_expr_list_aliased {% last %}):?
                    {% x => {
                        const columns = x[2] && x[2].map(asName);
                        const overriding = toStr(x[3]);
                        const insert = unwrap(x[4]);
                        const returning = x[6];
                        return track(x, {
                            type: 'insert',
                            into: unwrap(x[1]),
                            insert,
                            ...overriding && { overriding },
                            ...columns && { columns },
                            ...returning && { returning },
                        })
                    } %}
