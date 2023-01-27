import { ISelectFromStatement } from '@ulixee/sql-ast';
import { number, string } from '@ulixee/schema';
import SqlParser from '../lib/Parser';

test('support named args', () => {
  const sqlParser = new SqlParser(`SELECT * FROM runner(count => 0, success => 'yes')`);
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
  const sqlParser = new SqlParser(`SELECT * FROM runner(0, 'yes')`);
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

test('extractRunnerInput', () => {
  const sqlParser = new SqlParser(`SELECT * FROM runner(count => 0, success => 'yes')`);
  const inputSchemas = {
    runner: {
      count: number(),
      success: string(),
    }
  }
  const inputs = sqlParser.extractRunnerInputs(inputSchemas, []);

  expect(inputs.runner).toMatchObject({
    count: 0,
    success: 'yes',
  });
});

test('extractRunnerInput with boundValues', () => {
  const sqlParser = new SqlParser(`SELECT * FROM runner(count => $1, success => $2)`);
  const inputSchemas = {
    runner: {
      count: number(),
      success: string(),
    }
  }
  const inputs = sqlParser.extractRunnerInputs(inputSchemas, [0, 'yes']);
  
  expect(inputs.runner).toMatchObject({
    count: 0,
    success: 'yes',
  });
});

