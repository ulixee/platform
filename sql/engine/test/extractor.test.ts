import { ISelectFromStatement } from '@ulixee/sql-ast';
import { number, string } from '@ulixee/schema';
import SqlParser from '../lib/Parser';

test('support named args', () => {
  const sqlParser = new SqlParser(`SELECT * FROM extractor(count => 0, success => 'yes')`);
  const ast = sqlParser.ast as ISelectFromStatement;
  expect(ast.from[0].type).toBe('call');
  expect((ast.from[0] as any).args).toMatchObject([
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
  const sqlParser = new SqlParser(`SELECT * FROM extractor(0, 'yes')`);
  const ast = sqlParser.ast as ISelectFromStatement;
  expect(ast.from[0].type).toBe('call');
  expect((ast.from[0] as any).args).toMatchObject([
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
  const sqlParser = new SqlParser(`SELECT * FROM extractor(count => 0, success => 'yes')`);
  const inputSchemas = {
    extractor: {
      count: number(),
      success: string(),
    }
  }
  const inputs = sqlParser.extractFunctionCallInputs(inputSchemas, []);

  expect(inputs.extractor).toMatchObject({
    count: 0,
    success: 'yes',
  });
});

test('extractFunctionInput with boundValues', () => {
  const sqlParser = new SqlParser(`SELECT * FROM extractor(count => $1, success => $2)`);
  const inputSchemas = {
    extractor: {
      count: number(),
      success: string(),
    }
  }
  const inputs = sqlParser.extractFunctionCallInputs(inputSchemas, [0, 'yes']);

  expect(inputs.extractor).toMatchObject({
    count: 0,
    success: 'yes',
  });
});

