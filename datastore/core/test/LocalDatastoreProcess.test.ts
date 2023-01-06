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

test('returns datastore errors', async () => {
  const scriptPath = Path.resolve(__dirname, 'datastores/output.js');
  const datastoreProcess = new LocalDatastoreProcess(scriptPath);
  await expect(datastoreProcess.stream('default', {})).rejects.toThrowError('not found');
  await datastoreProcess.close();
});

test('it can run the datastore and return output', async () => {
  const scriptPath = Path.resolve(__dirname, 'datastores/output.js');
  const datastoreProcess = new LocalDatastoreProcess(scriptPath);
  const outputs = await datastoreProcess.stream('putout', {});
  await datastoreProcess.close();

  expect(outputs).toEqual([{ success: true }]);
});

test('it can get streamed results as one promise', async () => {
  const scriptPath = Path.resolve(__dirname, 'datastores/stream.js');
  const datastoreProcess = new LocalDatastoreProcess(scriptPath);
  const outputs = await datastoreProcess.stream('streamer', {});
  await datastoreProcess.close();

  expect(outputs).toEqual([{ record: 0 }, { record: 1 }, { record: 2 }]);
});

test('it can  streamed results one at a time', async () => {
  const scriptPath = Path.resolve(__dirname, 'datastores/stream.js');
  const datastoreProcess = new LocalDatastoreProcess(scriptPath);
  let counter = 0;
  const outputs = [];
  for await (const record of datastoreProcess.stream('streamer', {})) {
    counter += 1;
    outputs.push(record);
  }
  await datastoreProcess.close();
  expect(counter).toBe(3)

  expect(outputs).toEqual([{ record: 0 }, { record: 1 }, { record: 2 }]);
});
