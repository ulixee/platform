import * as Path from 'path';
import LocalDataboxProcess from '../lib/LocalDataboxProcess';

test('it can extract the databox runtime', async () => {
  const scriptPath = Path.resolve(__dirname, 'databoxes/meta.js');
  const databoxProcess = new LocalDataboxProcess(scriptPath);
  const meta = await databoxProcess.fetchMeta();
  await databoxProcess.close();

  expect(meta.coreVersion).toBe('1.0.0');
});


test('it can run the databox and return output', async () => {
  const scriptPath = Path.resolve(__dirname, 'databoxes/output.js');
  const databoxProcess = new LocalDataboxProcess(scriptPath);
  const { output } = await databoxProcess.exec({});
  await databoxProcess.close();

  expect(output).toMatchObject({ success: true });
});
