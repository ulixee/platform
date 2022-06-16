import UlixeeServer from '@ulixee/server';
import { Helpers, ConnectionToDataboxCore } from '@ulixee/databox-testing';
import Packager from '@ulixee/databox-packager';

let ulixeeServer: UlixeeServer;
let koaServer: Helpers.ITestKoaServer;
beforeAll(async () => {
  ulixeeServer = new UlixeeServer();
  Helpers.needsClosing.push({
    close: ulixeeServer.close.bind(ulixeeServer),
    onlyCloseOnFinal: true,
  });
  koaServer = await Helpers.runKoaServer();
  await ulixeeServer.listen(null, false);
});
afterAll(Helpers.afterAll);

test('it should be able to upload a databox and run it by hash', async () => {
  const packager = new Packager(require.resolve('./_testDatabox.js'));
  await packager.build();
  const serverHost = await ulixeeServer.address;
  await packager.upload(serverHost);

  const databoxPackage = packager.package;

  koaServer.get('/databox', ctx => {
    ctx.body = `<html><head><title>Databox!</title></head></html>`;
  });
  const remoteTransport = ConnectionToDataboxCore.remote(serverHost);
  await expect(
    remoteTransport.sendRequest({
      command: 'Databox.run',
      args: [databoxPackage.manifest.scriptRollupHash, { url: `${koaServer.baseUrl}/databox` }],
    }),
  ).resolves.toEqual({ output: { title: 'Databox!' } });
}, 45e3);

test('it should throw an error if the default export is not a databox', async () => {
  const packager = new Packager(require.resolve('./_testDatabox2.js'));
  await expect(
    packager.build()
  ).rejects.toThrow("The exported databox object must specify a module");
}, 45e3);
