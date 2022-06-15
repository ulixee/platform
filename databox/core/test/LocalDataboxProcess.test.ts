import * as Path from 'path';
import LocalDataboxProcess from '../lib/LocalDataboxProcess';

test('it can extract the databox module', async () => {
  const scriptPath = Path.resolve(__dirname, 'databoxes/module.js');
  const databoxProcess = new LocalDataboxProcess(scriptPath);
  const module = await databoxProcess.fetchModule();
  await databoxProcess.close();
    
  expect(module).toBe('@ulixee/test-database');
});


test('it can run the databox and return output', async () => {
  const scriptPath = Path.resolve(__dirname, 'databoxes/output.js');
  const databoxProcess = new LocalDataboxProcess(scriptPath);
  const output = await databoxProcess.run({});
  await databoxProcess.close();
    
  expect(output).toMatchObject({ success: true });
});