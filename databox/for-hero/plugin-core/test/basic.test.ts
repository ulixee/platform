import UlixeeServer from '@ulixee/server';
import { Helpers, ConnectionToDataboxCore } from '@ulixee/databox-testing';
import Packager from '@ulixee/databox-packager';
import * as Fs from 'fs';

let ulixeeServer: UlixeeServer;
let koaServer: Helpers.ITestKoaServer;
beforeAll(async () => {
  ulixeeServer = new UlixeeServer();
  Helpers.onClose(() => ulixeeServer.close(), true);
  koaServer = await Helpers.runKoaServer();
  await ulixeeServer.listen(null, false);
});
afterAll(Helpers.afterAll);

test('it should be able to upload a databox and run it by hash', async () => {
  if (Fs.existsSync(`${__dirname}/_testDatabox.dbx`))
    Fs.unlinkSync(`${__dirname}/_testDatabox.dbx`);
  const packager = new Packager(require.resolve('./_testDatabox.js'));
  const dbx = await packager.build();
  const serverHost = await ulixeeServer.address;
  await dbx.upload(serverHost);

  const manifest = packager.manifest;
  koaServer.get('/databox', ctx => {
    ctx.body = `<html><head><title>Databox!</title></head></html>`;
  });
  const remoteTransport = ConnectionToDataboxCore.remote(serverHost);
  Helpers.onClose(() => remoteTransport.disconnect())
  await expect(
    remoteTransport.sendRequest({
      command: 'Databox.exec',
      args: [{ versionHash: manifest.versionHash, input: { url: `${koaServer.baseUrl}/databox` } }],
    }),
  ).resolves.toEqual({
    metadata: expect.any(Object),
    output: { title: 'Databox!' },
    latestVersionHash: manifest.versionHash,
  });
}, 45e3);

test('it should throw an error if the default export is not a databox', async () => {
  const packager = new Packager(require.resolve('./_testDatabox2.js'));
  await expect(packager.build()).rejects.toThrow('Databox must specify a coreVersion');
}, 45e3);
