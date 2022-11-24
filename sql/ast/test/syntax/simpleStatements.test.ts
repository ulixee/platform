import { binary, checkStatement, int, name, ref, tbl } from '../../testing/helpers';
import { parseWithComments } from '../../lib/parser';

describe('Simple statements', () => {

  checkStatement(`COMMENT ON TABLE groups is 'some text'`, {
    type: 'comment',
    comment: 'some text',
    on: {
      type: 'table',
      name: { name: 'groups' }
    }
  })

  checkStatement(`COMMENT ON TABLE public.groups is 'some text'`, {
    type: 'comment',
    comment: 'some text',
    on: {
      type: 'table',
      name: { schema: 'public', name: 'groups', }
    }
  })

  checkStatement(`COMMENT ON COLUMN groups.members is 'some text'`, {
    type: 'comment',
    comment: 'some text',
    on: {
      type: 'column',
      column: { table: 'groups', column: 'members', }
    }
  })

  checkStatement(`COMMENT ON COLUMN public.groups.members is 'some text'`, {
    type: 'comment',
    comment: 'some text',
    on: {
      type: 'column',
      column: { schema: 'public', table: 'groups', column: 'members', }
    }
  });



  it('can fetch comments', () => {
    const { ast, comments } = parseWithComments('select /* comment a */ * from /* comment b */ tbl');
    expect(ast).toMatchObject([{
      type: 'select',
      columns: [{ expr: { type: 'ref', name: '*' } }],
      from: [tbl('tbl')],
    }]);
    expect(comments.map(c => c.comment)).toMatchObject(['/* comment a */ ', '/* comment b */ '])
  });

  // https://www.postgresql.org/docs/13/sql-syntax-lexical.html#SQL-SYNTAX-COMMENTS
  it('can fetch nested comments', () => {
    const { ast, comments } = parseWithComments('select /* comment /* nest */ a */ * from /* comment /* nest1 /* nest2 */ */ b */ tbl');
    expect(ast).toMatchObject([{
      type: 'select',
      columns: [{ expr: { type: 'ref', name: '*' } }],
      from: [tbl('tbl')],
    }]);
    expect(comments.map(c => c.comment)).toMatchObject(['/* comment /* nest */ a */ ', '/* comment /* nest1 /* nest2 */ */ b */ '])
  });

  checkStatement(`select * from (select a from mytable) myalias(col_renamed)`, {
    type: 'select',
    columns: [{ expr: { type: 'ref', name: '*' } }],
    from: [{
      type: 'statement',
      statement: {
        type: 'select',
        columns: [{ expr: ref('a') }],
        from: [tbl('mytable')],
      },
      alias: 'myalias',
      columnNames: [name('col_renamed')],
    }]
  });

  checkStatement(`select * from mytable "myAlias"(a)`, {
    type: 'select',
    columns: [{ expr: { type: 'ref', name: '*' } }],
    from: [{
      type: 'table',
      name: {
        name: 'mytable',
        alias: 'myAlias',
        columnNames: [name('a')],
      },
    }]
  });

  checkStatement(`select * from (select a,b from mytable) "myAlias"(x,y)`, {
    type: 'select',
    columns: [{ expr: { type: 'ref', name: '*' } }],
    from: [{
      type: 'statement',
      statement: {
        type: 'select',
        columns: [{ expr: ref('a') }, { expr: ref('b') }],
        from: [tbl('mytable')],
      },
      alias: 'myAlias',
      columnNames: [name('x'), name('y')],
    }]
  });


  // bugfix (Cannot select column named column) https://github.com/oguimbal/pgsql-ast-parser/issues/67
  checkStatement(`SELECT something AS column FROM whatever`, {
    type: 'select',
    columns: [{ expr: ref('something'), alias: { name: 'column' } }],
    from: [tbl('whatever')],
  });
});
