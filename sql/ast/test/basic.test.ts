import { checkSelect, checkInvalid, columns, ref, star, tbl, name, qname, checkStatement, int, binary } from '../testing/helpers';

describe('Select statements', () => {
  checkSelect(['select * from default()'], {
    type: 'select',
    columns: columns({ type: 'ref', name: '*' }),
    from: [{ type: 'call', function: { name: 'default' }, args: [] }],
  } as any);

});