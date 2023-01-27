import SqlParser, { SupportedCommandType } from '../lib/Parser';

test('extracts functions from SELECT', () => {
  const sqlParser = new SqlParser('SELECT * FROM funcName()');
  expect(sqlParser.functionNames).toEqual(['funcName']);
});

test('replace function alias "self" with name SELECT', () => {
  const sqlParser = new SqlParser('SELECT * FROM self()', { runner: 'funcName' });
  expect(sqlParser.functionNames).toEqual(['funcName']);
});

test('extracts tables from SELECT', () => {
  const sqlParser = new SqlParser('SELECT * FROM tableName');
  expect(sqlParser.tableNames).toEqual(['tableName']);
});

test('replace table alias "self" with name', () => {
  const sqlParser = new SqlParser('SELECT * FROM self', { table: 'tableName' });
  expect(sqlParser.tableNames).toEqual(['tableName']);
});

test('toSql replaces table alias "self" with name', () => {
  const sqlParser = new SqlParser('SELECT * FROM self', { table: 'tableName' });
  expect(sqlParser.toSql()).toEqual('SELECT *  FROM "tableName"');
});

test('basic INSERT', async () => {
  const sqlParser = new SqlParser(`INSERT INTO this AS test (column1, column2) VALUES ('value1', 10)`);
  await expect(sqlParser.commandType).toBe(SupportedCommandType.insert);
});

test('basic SELECT', async () => {
  const sqlParser = new SqlParser('SELECT * FROM this');
  await expect(sqlParser.commandType).toBe(SupportedCommandType.select);
});

test('basic UPDATE', async () => {
  const sqlParser = new SqlParser(`UPDATE this SET column1='value2', column2=20`);
  await expect(sqlParser.commandType).toBe(SupportedCommandType.update);
});

test('basic DELETE', async () => {
  const sqlParser = new SqlParser('DELETE FROM this');
  await expect(sqlParser.commandType).toBe(SupportedCommandType.delete);
});
