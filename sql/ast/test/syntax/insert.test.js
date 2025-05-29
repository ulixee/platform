"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("../../testing/helpers");
describe('Insert', () => {
    (0, helpers_1.checkInsert)([`insert into test(a, b) values (1, 'x')`, `INSERT INTO"test"(a,"b")VALUES(1,'x')`], {
        type: 'insert',
        into: { name: 'test' },
        columns: [{ name: 'a' }, { name: 'b' }],
        insert: {
            type: 'values',
            values: [[{
                        type: 'integer',
                        value: 1,
                    }, {
                        type: 'string',
                        value: 'x',
                    }]]
        },
    });
    (0, helpers_1.checkInsertLoc)([`insert into test(a) values (1)`], {
        _location: { start: 0, end: 29 },
        type: 'insert',
        into: {
            _location: { start: 12, end: 16 },
            name: 'test',
        },
        columns: [{
                _location: { start: 17, end: 18 },
                name: 'a'
            }],
        insert: {
            _location: { start: 20, end: 29 },
            type: 'values',
            values: [[{
                        _location: { start: 28, end: 29 },
                        type: 'integer',
                        value: 1,
                    },]]
        },
    });
    (0, helpers_1.checkInsert)([`insert into test values (1) returning "id";`], {
        type: 'insert',
        into: { name: 'test' },
        returning: [{ expr: { type: 'ref', name: 'id' } }],
        insert: {
            type: 'values',
            values: [[{
                        type: 'integer',
                        value: 1,
                    },]]
        },
    });
    (0, helpers_1.checkInsert)([`insert into test values (1) returning "id" as x;`], {
        type: 'insert',
        into: { name: 'test' },
        returning: [{ expr: { type: 'ref', name: 'id' }, alias: { name: 'x' } }],
        insert: {
            type: 'values',
            values: [[{
                        type: 'integer',
                        value: 1,
                    },]]
        },
    });
    (0, helpers_1.checkInsert)([`insert into test values (1) returning "id", val;`], {
        type: 'insert',
        into: { name: 'test' },
        returning: [{ expr: { type: 'ref', name: 'id' } }, { expr: { type: 'ref', name: 'val' } }],
        insert: {
            type: 'values',
            values: [[{
                        type: 'integer',
                        value: 1,
                    },]]
        },
    });
    (0, helpers_1.checkInsert)([`insert into db . test(a, b) values (1, 'x')`, `INSERT INTO"db"."test"(a,"b")VALUES(1,'x')`], {
        type: 'insert',
        into: { name: 'test', schema: 'db' },
        columns: [{ name: 'a' }, { name: 'b' }],
        insert: {
            type: 'values',
            values: [[{
                        type: 'integer',
                        value: 1,
                    }, {
                        type: 'string',
                        value: 'x',
                    }]]
        }
    });
    (0, helpers_1.checkInsert)([`insert into db . test(a, b) select a,b FROM x . test`], {
        type: 'insert',
        into: { name: 'test', schema: 'db' },
        columns: [{ name: 'a' }, { name: 'b' }],
        insert: {
            type: 'select',
            from: [{
                    type: 'table',
                    name: {
                        name: 'test',
                        schema: 'x',
                    },
                }],
            columns: [{
                    expr: {
                        type: 'ref',
                        name: 'a',
                    }
                }, {
                    expr: {
                        type: 'ref',
                        name: 'b',
                    }
                }],
        }
    });
    (0, helpers_1.checkInsert)([`insert into "test" select * FROM test`, `insert into test(select * FROM test)`], {
        type: 'insert',
        into: { name: 'test' },
        insert: {
            type: 'select',
            from: [(0, helpers_1.tbl)('test')],
            columns: [{
                    expr: {
                        type: 'ref',
                        name: '*',
                    }
                }],
        }
    });
    (0, helpers_1.checkInsert)([`insert into test(a, b) values (1, default)`], {
        type: 'insert',
        into: { name: 'test' },
        columns: [{ name: 'a' }, { name: 'b' }],
        insert: {
            type: 'values',
            values: [[{
                        type: 'integer',
                        value: 1,
                    },
                    { type: 'default' }]]
        }
    });
    (0, helpers_1.checkInsert)([`insert into test(a, b) overriding system value values (1, default)`], {
        type: 'insert',
        into: { name: 'test' },
        columns: [{ name: 'a' }, { name: 'b' }],
        overriding: 'system',
        insert: {
            type: 'values',
            values: [[{
                        type: 'integer',
                        value: 1,
                    },
                    { type: 'default' }]]
        }
    });
    (0, helpers_1.checkInsert)([`insert into test(a, b) overriding user value values (1, default)`], {
        type: 'insert',
        into: { name: 'test' },
        columns: [{ name: 'a' }, { name: 'b' }],
        overriding: 'user',
        insert: {
            type: 'values',
            values: [[{
                        type: 'integer',
                        value: 1,
                    },
                    { type: 'default' }]]
        }
    });
});
//# sourceMappingURL=insert.test.js.map