import * as Path from 'path';
import LocalDataboxProcess from '../lib/LocalDataboxProcess';

test('it can extract the databox runtime', async () => {
  const scriptPath = Path.resolve(__dirname, 'databoxes/meta.js');
  const databoxProcess = new LocalDataboxProcess(scriptPath);
  const meta = await databoxProcess.fetchMeta();
  await databoxProcess.close();

  expect(meta.coreVersion).toBe('1.0.0');
});

test('it can extract the databox schema', async () => {
  const scriptPath = Path.resolve(__dirname, 'databoxes/schema.js');
  const databoxProcess = new LocalDataboxProcess(scriptPath);
  const meta = await databoxProcess.fetchMeta();
  await databoxProcess.close();

  expect(meta.functionsByName.default.schema).toEqual({
    input: {
      field: {
        typeName: 'string',
        minLength: 1,
        description: 'a field you should use',
      },
    },
    output: {
      success: {
        typeName: 'boolean',
      },
    },
  });
});

test('returns databox errors', async () => {
  const scriptPath = Path.resolve(__dirname, 'databoxes/output.js');
  const databoxProcess = new LocalDataboxProcess(scriptPath);
  await expect(databoxProcess.exec('default', {})).rejects.toThrowError('not found');
  await databoxProcess.close();
});

test('it can run the databox and return output', async () => {
  const scriptPath = Path.resolve(__dirname, 'databoxes/output.js');
  const databoxProcess = new LocalDataboxProcess(scriptPath);
  const { outputs } = await databoxProcess.exec('putout', {});
  await databoxProcess.close();

  expect(outputs).toEqual([{ success: true }]);
});
