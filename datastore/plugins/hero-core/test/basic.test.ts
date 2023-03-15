import * as Fs from 'fs';
import { CloudNode } from '@ulixee/cloud';
import { Helpers } from '@ulixee/datastore-testing';
import Packager from '@ulixee/datastore-packager';
import { ConnectionToDatastoreCore } from '@ulixee/datastore';
import * as Path from 'path';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'hero-core/basic.test');

let cloudNode: CloudNode;
let koaServer: Helpers.ITestKoaServer;
beforeAll(async () => {
  cloudNode = new CloudNode();
  cloudNode.router.datastoreConfiguration = {
    datastoresDir: storageDir,
    datastoresTmpDir: Path.join(storageDir, 'tmp'),
  };
  Helpers.onClose(() => cloudNode.close(), true);
  koaServer = await Helpers.runKoaServer();
  await cloudNode.listen(null, false);
});
afterAll(Helpers.afterAll);

test('it should be able to upload a datastore and run it by hash', async () => {
  if (Fs.existsSync(`${__dirname}/_testDatastore.dbx`))
    await Fs.promises.rm(`${__dirname}/_testDatastore.dbx`, { recursive: true });
  const packager = new Packager(require.resolve('./_testDatastore.js'));
  const dbx = await packager.build();
  const host = await cloudNode.address;
  await dbx.upload(host);

  const manifest = packager.manifest;
  koaServer.get('/datastore', ctx => {
    ctx.body = `<html><head><title>Datastore!</title></head></html>`;
  });
  const remoteTransport = ConnectionToDatastoreCore.remote(host);
  Helpers.onClose(() => remoteTransport.disconnect());
  await expect(
    remoteTransport.sendRequest({
      command: 'Datastore.query',
      args: [
        {
          sql: 'SELECT title FROM default(url => $1)',
          boundValues: [`${koaServer.baseUrl}/datastore`],
          versionHash: manifest.versionHash,
        },
      ],
    }),
  ).resolves.toEqual({
    metadata: expect.any(Object),
    outputs: [{ title: 'Datastore!' }],
    latestVersionHash: manifest.versionHash,
  });
}, 45e3);

test('it should throw an error if the default export is not a datastore', async () => {
  const packager = new Packager(require.resolve('./_testDatastore2.js'));
  await expect(packager.build()).rejects.toThrow('Datastore must specify a coreVersion');
}, 45e3);
