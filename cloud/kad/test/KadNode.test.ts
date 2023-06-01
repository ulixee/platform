import { CloudNode } from '@ulixee/cloud';
import { sha256 } from '@ulixee/commons/lib/hashUtils';
import Identity from '@ulixee/crypto/lib/Identity';
import { Helpers } from '@ulixee/datastore-testing';
import INodeInfo from '@ulixee/platform-specification/types/INodeInfo';
import * as Fs from 'fs';
import * as Path from 'path';

const dbFolder = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'KadNode.test');

afterEach(Helpers.afterEach);
afterAll(Helpers.afterAll);

test('should correctly register peers', async () => {
  const node1 = await startKadNode();
  const node2 = await startKadNode();
  await node2.kad.addPeer(node1.kad.nodeInfo);
  await node2.kad.ensureNetworkConnected();

  const nodeInfos1 = node1.kad.getKnownNodes();
  const nodeInfos2 = node2.kad.getKnownNodes();

  expect(nodeInfos1[0]).toMatchObject({
    ...node2.kad.nodeInfo,
    lastSeenDate: expect.any(Date),
  });
  expect(nodeInfos2[0]).toMatchObject({
    ...node1.kad.nodeInfo,
    lastSeenDate: expect.any(Date),
  });
});

test('should provide and find providers', async () => {
  const node1 = await startKadNode({ port: 3020 });
  const node2 = await startKadNode({
    boostrapList: [node1.kad.nodeHost],
    port: 3021,
  });

  const key = sha256('test');

  await node2.kad.provide(key);
  const providerPeers: INodeInfo[] = [];
  for await (const node of node1.kad.findProviderNodes(key)) {
    providerPeers.push(node);
  }

  expect(providerPeers).toHaveLength(1);
});

test('start and connect multiple nodes', async () => {
  const nodes = await Promise.all(
    Array(10)
      .fill(0)
      .map(() => startKadNode()),
  );

  for (let i = 0; i < nodes.length; i += 1) {
    let nextIdx = i + 1;
    if (nextIdx > nodes.length - 1) nextIdx = 0;
    await nodes[i].kad.addPeer(nodes[nextIdx].kad.nodeInfo);
  }

  await Promise.all(nodes.map(x => x.kad.ensureNetworkConnected()));
  let i = 0;
  for (const conn of nodes) {
    const peerIds = conn.kad.peerStore.all();
    expect(peerIds.length).toBeGreaterThanOrEqual(1);
    i++;
  }

  // findPeer test
  const peerLookup = await nodes[2].kad.findPeer(nodes[8].kad.nodeId);
  expect(peerLookup).toBeTruthy();
  expect(nodes[8].kad.nodeInfo.apiHost).toContain(peerLookup.apiHost);
}, 30000);

test('can find closer peers in the network', async () => {
  const nDHTs = 30;
  const dhts = await Promise.all(
    Array(nDHTs)
      .fill(0)
      .map(() => startKadNode({})),
  );

  const connected: Array<Promise<void>> = [];

  for (let i = 0; i < dhts.length - 1; i++) {
    connected.push(dhts[i].kad.addPeer(dhts[(i + 1) % dhts.length].kad.nodeInfo));
  }

  await Promise.all(connected);

  const closers: INodeInfo[] = await dhts[1].kad.findClosestNodes(sha256('foo'));

  expect(closers).not.toHaveLength(0);
}, 24e3);

// HELPERS /////////////////////////////////////////////////////////////////////////////////////////
let counter = 0;
async function startKadNode({
  boostrapList,
  port,
}: {
  boostrapList?: string[];
  port?: number;
} = {}): Promise<CloudNode> {
  const dir = Path.join(dbFolder, String(++counter));
  Fs.mkdirSync(dir, { recursive: true });
  Helpers.onClose(() => Fs.promises.rm(dir, { recursive: true }));
  const node = new CloudNode({
    kadEnabled: true,
    networkIdentity: Identity.createSync(),
    kadBootstrapPeers: boostrapList,
    kadDbPath: Path.join(dir, 'kad.db'),
    listenOptions: { publicPort: port },
  });
  Helpers.needsClosing.push(node);
  return await node.listen();
}
