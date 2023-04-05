import * as Path from 'path';
import LocalDatastoreProcess from '../lib/LocalDatastoreProcess';

test('it can extract the datastore runtime', async () => {
  const scriptPath = Path.resolve(__dirname, 'datastores/meta.js');
  const datastoreProcess = new LocalDatastoreProcess(scriptPath);
  const meta = await datastoreProcess.fetchMeta();
  await datastoreProcess.close();

  expect(meta.coreVersion).toBe('1.0.0');
});

test('it can extract the datastore schema', async () => {
  const scriptPath = Path.resolve(__dirname, 'datastores/schema.js');
  const datastoreProcess = new LocalDatastoreProcess(scriptPath);
  const meta = await datastoreProcess.fetchMeta();
  await datastoreProcess.close();

  expect(meta.runnersByName.default.schema).toEqual({
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
