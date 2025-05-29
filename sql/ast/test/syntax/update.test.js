"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("../../testing/helpers");
describe('Update', () => {
    (0, helpers_1.checkUpdate)([`update test set a=1`, `UPDATE"test"SET"a"=1`], {
        type: 'update',
        table: { name: 'test' },
        sets: [{
                column: { name: 'a' },
                value: { type: 'integer', value: 1 }
            }]
    });
    (0, helpers_1.checkUpdate)([`update test set (a,b)=(1,2), c=3`], {
        type: 'update',
        table: { name: 'test' },
        sets: [{
                column: { name: 'a' },
                value: { type: 'integer', value: 1 }
            }, {
                column: { name: 'b' },
                value: { type: 'integer', value: 2 }
            }, {
                column: { name: 'c' },
                value: { type: 'integer', value: 3 }
            }]
    });
    (0, helpers_1.checkUpdate)([`update test set a=1, b=a where a>1`], {
        type: 'update',
        table: { name: 'test' },
        sets: [{
                column: { name: 'a' },
                value: { type: 'integer', value: 1 }
            }, {
                column: { name: 'b' },
                value: { type: 'ref', name: 'a' },
            }],
        where: {
            type: 'binary',
            op: '>',
            left: { type: 'ref', name: 'a' },
            right: { type: 'integer', value: 1 },
        }
    });
    (0, helpers_1.checkUpdate)([`update test set value=default`], {
        type: 'update',
        table: { name: 'test' },
        sets: [{
                column: { name: 'value' },
                value: { type: 'default' },
            }],
    });
    (0, helpers_1.checkUpdate)([`update mytable
    set col = subsel.subcol
        from (select id, subcol from subtable) as subsel
    where subsel.id=mytable.id`], {
        type: 'update',
        table: { name: 'mytable' },
        sets: [{
                column: { name: 'col' },
                value: { type: 'ref', name: 'subcol', table: { name: 'subsel' } },
            }],
        from: {
            type: 'statement',
            alias: 'subsel',
            statement: {
                type: 'select',
                columns: [(0, helpers_1.col)('id'), (0, helpers_1.col)('subcol')],
                from: [{
                        type: 'table',
                        name: { name: 'subtable' },
                    }]
            },
        },
        where: {
            type: 'binary',
            op: '=',
            left: { type: 'ref', name: 'id', table: { name: 'subsel' } },
            right: { type: 'ref', name: 'id', table: { name: 'mytable' } },
        }
    });
});
//# sourceMappingURL=update.test.js.map