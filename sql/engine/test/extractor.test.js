"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const schema_1 = require("@ulixee/schema");
const Parser_1 = require("../lib/Parser");
test('support named args', () => {
    const sqlParser = new Parser_1.default(`SELECT * FROM extractor(count => 0, success => 'yes')`);
    const ast = sqlParser.ast;
    expect(ast.from[0].type).toBe('call');
    expect(ast.from[0].args).toMatchObject([
        {
            "type": "integer",
            "value": 0,
            "key": "count"
        },
        {
            "type": "string",
            "value": "yes",
            "key": "success"
        }
    ]);
});
test('support unnamed args', () => {
    const sqlParser = new Parser_1.default(`SELECT * FROM extractor(0, 'yes')`);
    const ast = sqlParser.ast;
    expect(ast.from[0].type).toBe('call');
    expect(ast.from[0].args).toMatchObject([
        {
            "type": "integer",
            "value": 0
        },
        {
            "type": "string",
            "value": "yes"
        }
    ]);
});
test('extractFunctionInput', () => {
    const sqlParser = new Parser_1.default(`SELECT * FROM extractor(count => 0, success => 'yes')`);
    const inputSchemas = {
        extractor: {
            count: (0, schema_1.number)(),
            success: (0, schema_1.string)(),
        }
    };
    const inputs = sqlParser.extractFunctionCallInputs(inputSchemas, []);
    expect(inputs.extractor).toMatchObject({
        count: 0,
        success: 'yes',
    });
});
test('extractFunctionInput with boundValues', () => {
    const sqlParser = new Parser_1.default(`SELECT * FROM extractor(count => $1, success => $2)`);
    const inputSchemas = {
        extractor: {
            count: (0, schema_1.number)(),
            success: (0, schema_1.string)(),
        }
    };
    const inputs = sqlParser.extractFunctionCallInputs(inputSchemas, [0, 'yes']);
    expect(inputs.extractor).toMatchObject({
        count: 0,
        success: 'yes',
    });
});
//# sourceMappingURL=extractor.test.js.map