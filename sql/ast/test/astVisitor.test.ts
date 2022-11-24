import { astVisitor } from '../lib/astVisitor';

describe('Ast visitor', () => {

  // just a quickcheck. (those were throwing)
  it('visits ref when implemented', () => {
    let visited: string | null = null;
    const mapper = astVisitor(() => ({
      ref: r => visited = r.name,
    }))
    mapper.expr({
      type: 'unary',
      op: 'NOT',
      operand: {
        type: 'ref',
        name: 'myRef'
      }
    })
    expect(visited).toEqual('myRef');
  });

  it('does not visit ref when not implemented', () => {
    let visited = null;
    astVisitor(() => ({
    })).expr({
      type: 'unary',
      op: 'NOT',
      operand: {
        type: 'ref',
        name: 'myRef'
      }
    });
    expect(visited).toEqual(null);
  });


  it('allow super call', () => {
    let visited: string | null = null;
    astVisitor(v => ({
      ref: r => {
        visited = r.name;
        return v.super().ref(r);
      },
    })).expr({
      type: 'unary',
      op: 'NOT',
      operand: {
        type: 'ref',
        name: 'myRef'
      }
    })
    expect(visited).toEqual('myRef');
  });
})