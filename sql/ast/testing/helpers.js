"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tbl = exports.int = exports.qname = exports.name = exports.binary = exports.ref = exports.col = exports.starCol = exports.star = exports.checkInterval = exports.columns = exports.checkTreeExprLoc = exports.checkTreeExpr = exports.checkInvalidExpr = exports.checkValid = exports.checkInvalid = exports.checkStatement = exports.checkUpdate = exports.checkDelete = exports.checkInsertLoc = exports.checkInsert = exports.checkSelect = void 0;
// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable jest/no-jasmine-globals */
// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable jest/no-export */
const nearley_1 = require("nearley");
const main_1 = require("../syntax/compiled/main");
const utils_1 = require("../lib/utils");
const astMapper_1 = require("../lib/astMapper");
const toSql_1 = require("../lib/toSql");
const parser_1 = require("../lib/parser");
const IntervalUtils_1 = require("../lib/helpers/IntervalUtils");
const lexer_1 = require("../lib/helpers/lexer");
function checkSelect(value, expected) {
    checkTree(value, expected, (p, m) => m.statement(p));
}
exports.checkSelect = checkSelect;
function checkInsert(value, expected) {
    checkTree(value, expected, (p, m) => m.statement(p));
}
exports.checkInsert = checkInsert;
function checkInsertLoc(value, expected) {
    checkTree(value, expected, (p, m) => m.statement(p), undefined, true);
}
exports.checkInsertLoc = checkInsertLoc;
function checkDelete(value, expected) {
    checkTree(value, expected, (p, m) => m.statement(p));
}
exports.checkDelete = checkDelete;
function checkUpdate(value, expected) {
    checkTree(value, expected, (p, m) => m.statement(p));
}
exports.checkUpdate = checkUpdate;
function checkStatement(value, expected) {
    checkTree(value, expected, (p, m) => m.statement(p));
}
exports.checkStatement = checkStatement;
function hideLocs(val) {
    if (!val) {
        return val;
    }
    if (typeof val !== 'object') {
        return val;
    }
    if (Array.isArray(val)) {
        return val.map(hideLocs);
    }
    const ret = {};
    for (const [k, v] of Object.entries(val)) {
        ret[k] = hideLocs(v);
    }
    delete ret._location;
    return ret;
}
function deepEqual(a, b, strict, depth = 10, numberDelta = 0.0001) {
    if (depth < 0) {
        throw new Error('Comparing too deep entities');
    }
    if (a === b) {
        return true;
    }
    if (!strict) {
        // should not use '==' because it could call .toString() on objects when compared to strings.
        // ... which is not ok. Especially when working with translatable objects, which .toString() returns a transaltion (a string, thus)
        if (!a && !b) {
            return true;
        }
    }
    if (Array.isArray(a)) {
        if (!Array.isArray(b) || a.length !== b.length)
            return false;
        for (let i = 0; i < a.length; i++) {
            if (!deepEqual(a[i], b[i], strict, depth - 1, numberDelta))
                return false;
        }
        return true;
    }
    // handle dates
    if (a instanceof Date || b instanceof Date) {
        return a === b;
    }
    const fa = Number.isFinite(a);
    const fb = Number.isFinite(b);
    if (fa || fb) {
        return fa && fb && Math.abs(a - b) <= numberDelta;
    }
    // handle plain objects
    if (typeof a !== 'object' || typeof a !== typeof b)
        return false;
    if (!a || !b) {
        return false;
    }
    const ak = Object.keys(a);
    const bk = Object.keys(b);
    if (strict && ak.length !== bk.length)
        return false;
    const set = strict
        ? Object.keys(a)
        : new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of set) {
        if (!deepEqual(a[k], b[k], strict, depth - 1, numberDelta))
            return false;
    }
    return true;
}
function inspect(elt) {
    return require('util').inspect(elt);
}
function checkTree(value, expected, mapper, start, checkLocations) {
    if (typeof value === 'string') {
        value = [value];
    }
    for (const sql of value) {
        // eslint-disable-next-line @typescript-eslint/no-loop-func
        it(`parses ${sql}`, () => {
            const gram = nearley_1.Grammar.fromCompiled(main_1.default);
            if (start) {
                gram.start = start;
            }
            function doParse(psql) {
                const parser = new nearley_1.Parser(gram);
                parser.feed(psql);
                const ret = parser.finish();
                if (!ret.length) {
                    fail('Unexpected end of input');
                }
                if (ret.length !== 1) {
                    const noLocs = ret.map(hideLocs);
                    if (noLocs.slice(1).every(p => deepEqual(p, noLocs[0]))) {
                        fail(`${noLocs.length} ambiguous syntaxes, but they yielded the same ASTs : ${inspect(noLocs[0])}`);
                    }
                    else {
                        fail(`${noLocs.length} ambiguous syntaxes, AND THEY HAVE YIELDED DIFFERENT ASTs : \n${noLocs
                            .map(inspect)
                            .join('\n\n           ======================      \n\n')}`);
                    }
                }
                return (0, utils_1.trimNullish)(ret[0]);
            }
            const parsedWithLocations = (0, lexer_1.tracking)(() => doParse(sql));
            const parsedWithoutTracking = doParse(sql);
            const parsed = checkLocations
                ? parsedWithLocations
                : parsedWithoutTracking;
            // check that it is the AST we expected
            expect(parsed).toEqual(expected);
            // check that top-level statements always have at least some kind of basic position
            expect(parsedWithLocations._location).toBeTruthy();
            // check that it generates the same with/without location tracking
            expect(hideLocs(parsedWithLocations)).toEqual(hideLocs(parsedWithoutTracking));
            // check that it is stable through ast modifier
            const modified = mapper(parsed, (0, astMapper_1.astMapper)(() => ({})));
            expect(modified).toEqual(parsed);
            // check that it procuces sql
            let newSql;
            try {
                newSql = mapper(parsed, toSql_1.toSql);
                expect(newSql).toEqual(expect.any(String));
            }
            catch (e) {
                e.message = `⛔ ⛔ ⛔ ⛔ ⛔ ⛔ ⛔ ⛔ ⛔
        Failed to generate SQL from the parsed AST
            => There should be something wrong in toSql.ts
⛔ ⛔ ⛔ ⛔ ⛔ ⛔ ⛔ ⛔ ⛔
            ${e.message}`;
                throw e;
            }
            // reparse the generated sql...
            let reparsed;
            try {
                expect(typeof newSql).toBe('string');
                reparsed = checkLocations
                    ? (0, lexer_1.tracking)(() => doParse(newSql))
                    : doParse(newSql);
            }
            catch (e) {
                e.message = `⛔ ⛔ ⛔ ⛔ ⛔ ⛔ ⛔ ⛔ ⛔
        The parsed AST converted-back to SQL generated invalid SQL.
            => There should be something wrong in toSql.ts
⛔ ⛔ ⛔ ⛔ ⛔ ⛔ ⛔ ⛔ ⛔
            ${e.message}`;
                throw e;
            }
            // ...and check it still produces the same ast.
            expect(hideLocs(reparsed)).toEqual(hideLocs(expected));
        });
    }
}
function checkInvalid(sql, start) {
    it(`does not parses ${sql}`, () => {
        const gram = nearley_1.Grammar.fromCompiled(main_1.default);
        if (start) {
            gram.start = start;
        }
        const parser = new nearley_1.Parser(gram);
        parser.feed(sql);
        expect(parser.results).not.toEqual([]);
    });
}
exports.checkInvalid = checkInvalid;
function checkValid(sql, start) {
    it(`parses ${sql}`, () => {
        const gram = nearley_1.Grammar.fromCompiled(main_1.default);
        if (start) {
            gram.start = start;
        }
        const parser = new nearley_1.Parser(gram);
        parser.feed(sql);
        expect(parser.results).not.toEqual([]);
    });
}
exports.checkValid = checkValid;
function checkInvalidExpr(sql) {
    return checkInvalid(sql, 'expr');
}
exports.checkInvalidExpr = checkInvalidExpr;
function checkTreeExpr(value, expected) {
    checkTree(value, expected, (p, m) => m.expr(p), 'expr');
}
exports.checkTreeExpr = checkTreeExpr;
function checkTreeExprLoc(value, expected) {
    checkTree(value, expected, (p, m) => m.expr(p), 'expr', true);
}
exports.checkTreeExprLoc = checkTreeExprLoc;
function columns(...vals) {
    return vals.map(expr => typeof expr === 'string'
        ? { expr: { type: 'ref', name: expr } }
        : { expr });
}
exports.columns = columns;
function checkInterval(input, expected) {
    for (const v of Array.isArray(input) ? input : [input]) {
        it(`parses interval "${v}"`, () => {
            expect((0, IntervalUtils_1.normalizeInterval)((0, parser_1.parseIntervalLiteral)(v))).toEqual(expected);
        });
    }
}
exports.checkInterval = checkInterval;
exports.star = { type: 'ref', name: '*' };
exports.starCol = { expr: exports.star };
function col(n, alias) {
    return {
        expr: ref(n),
        ...alias ? { name: alias } : undefined,
    };
}
exports.col = col;
function ref(n) {
    return { type: 'ref', name: n };
}
exports.ref = ref;
function binary(left, op, right) {
    return { type: 'binary', left, op, right };
}
exports.binary = binary;
function name(n) {
    return { name: n };
}
exports.name = name;
function qname(n, schema) {
    return { name: n, schema };
}
exports.qname = qname;
function int(value) {
    return { type: 'integer', value };
}
exports.int = int;
function tbl(nm) {
    return {
        type: 'table',
        name: name(nm),
    };
}
exports.tbl = tbl;
//# sourceMappingURL=helpers.js.map