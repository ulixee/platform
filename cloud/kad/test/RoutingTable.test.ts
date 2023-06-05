import { xor } from '@ulixee/commons/lib/bufferUtils';
import { pickRandom } from '@ulixee/commons/lib/utils';
import Identity from '@ulixee/crypto/lib/Identity';
import { IKadApiTypes } from '@ulixee/platform-specification/cloud/KadApis';
import INodeInfo from '@ulixee/platform-specification/types/INodeInfo';
import * as Fs from 'fs';
import * as Path from 'path';
import KadDb from '../db/KadDb';
import { PeerStore } from '../lib/PeerStore';
import { KAD_CLOSE_TAG_NAME, KBUCKET_SIZE, RoutingTable } from '../lib/RoutingTable';
import { createNodeIds, nodeIdToKadId } from './_helpers';

const dbPath = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'RoutingTable.test', 'kad.db');

let table: RoutingTable;
let db: KadDb;
type T = keyof IKadApiTypes;

const network = {
  sendRequest(to: INodeInfo, _command: T, _args: IKadApiTypes[T]['args']) {
    return Promise.resolve(`got something from${to.nodeId}`);
  },
};
const networkSendRequestSpy = jest.spyOn(network, 'sendRequest');

beforeEach(async () => {
  db = new KadDb(dbPath);
  const peerStore = new PeerStore(db);

  const identity = await Identity.create();
  table = new RoutingTable(
    {
      nodeInfo: {
        nodeId: identity.bech32,
        kadId: nodeIdToKadId(identity.bech32),
        kadHost: 'localhost:1818',
        apiHost: 'localhost:1818',
      },
      network: network as any,
      peerStore,
    },
    {},
  );
  await table.start();
  networkSendRequestSpy.mockReset();
});

afterEach(async () => {
  await table.stop();
  db.close();
  await Fs.promises.rm(dbPath, { recursive: true });
});


test('can add to the routing table', async () => {
  const ids = createNodeIds(20);

  await Promise.all(
    Array.from({ length: 1000 }).map(async () => {
      await table.add(pickRandom(ids));
    }),
  );

  await Promise.all(
    Array.from({ length: 20 }).map(async () => {
      const id = pickRandom(ids);
      const key = nodeIdToKadId(id);

      expect(table.closestPeers(key, 5).length).toBeGreaterThan(0);
    }),
  );
});

test('can remove routingTable entries', async () => {
  const nodeIds = createNodeIds(10);
  await Promise.all(
    nodeIds.map(async peer => {
      await table.add(peer);
    }),
  );

  const key = nodeIdToKadId(nodeIds[2]);
  expect(table.closestPeers(key, 10)).toHaveLength(10);

  await table.remove(nodeIds[5]);
  expect(table.closestPeers(key, 10)).toHaveLength(9);
  expect(table.size).toBe(9);
});

test('can find closest peers', async () => {
  const nodeIds = createNodeIds(18);
  await Promise.all(
    nodeIds.map(async peer => {
      await table.add(peer);
    }),
  );

  const key = nodeIdToKadId(nodeIds[2]);
  expect(table.closestPeers(key, 15)).toHaveLength(15);
});

test('favors old nodeIds that respond to pings', async () => {
  let fn: (() => Promise<any>) | undefined;

  // execute queued functions immediately
  table.pingQueue = {
    run: async (f: () => Promise<any>): Promise<any> => {
      fn = f;
    },
    stop() {},
    clear() {},
  } as any;

  const nodeIds = createNodeIds(2);

  const oldPeer = {
    id: nodeIdToKadId(nodeIds[0]),
    nodeId: nodeIds[0],
    vectorClock: 0,
  };
  const newPeer = {
    id: nodeIdToKadId(nodeIds[1]),
    nodeId: nodeIds[1],
    vectorClock: 0,
  };

  // @ts-expect-error
  table.onPing([oldPeer], newPeer);

  if (table.kb == null) {
    throw new Error('kbucket not defined');
  }

  networkSendRequestSpy.mockImplementationOnce(() => Promise.resolve(undefined));

  // add the old peer
  table.kb.add(oldPeer);

  // simulate connection succeeding

  if (fn == null) {
    throw new Error('nothing added to queue');
  }

  // perform the ping
  await fn();

  expect(networkSendRequestSpy).toHaveBeenCalledTimes(1);

  // did not add the new peer
  expect(table.kb.get(newPeer.id)).toBeNull();

  // kept the old peer
  expect(table.kb.get(oldPeer.id)).not.toBeNull();
});

test('evicts oldest peer that does not respond to ping', async () => {
  let fn: (() => Promise<any>) | undefined;

  // execute queued functions immediately
  table.pingQueue = {
    run: async (f: () => Promise<any>): Promise<any> => {
      fn = f;
    },
    stop() {},
    clear() {},
  } as any;

  const nodeIds = createNodeIds(2);

  const oldPeer = {
    id: nodeIdToKadId(nodeIds[0]),
    nodeId: nodeIds[0],
    vectorClock: 0,
  };
  const newPeer = {
    id: nodeIdToKadId(nodeIds[1]),
    nodeId: nodeIds[1],
    vectorClock: 0,
  };

  // @ts-expect-error
  table.onPing([oldPeer], newPeer);

  if (table.kb == null) {
    throw new Error('kbucket not defined');
  }

  networkSendRequestSpy.mockImplementationOnce(() =>
    Promise.reject(new Error('Timeout connecting')),
  );

  if (fn == null) {
    throw new Error('nothing added to queue');
  }

  // perform the ping
  await fn();

  expect(networkSendRequestSpy).toHaveBeenCalledTimes(1);

  // added the new peer
  expect(table.kb.get(newPeer.id)).not.toBeNull();

  // evicted the old peer
  expect(table.kb.get(oldPeer.id)).toBeNull();
});

test('tags newly found kad-close nodeIds', async () => {
  const remotePeer = Identity.createSync().bech32;
  const tagPeerSpy = jest.spyOn(db.peers, 'updateTag');

  await table.add(remotePeer);

  await new Promise(resolve => tagPeerSpy.mockImplementationOnce(resolve));
  expect(tagPeerSpy.mock.calls[0][0]).toBe(remotePeer);
  expect(tagPeerSpy.mock.calls[0][1]).toBe(KAD_CLOSE_TAG_NAME);
});

test('removes tags from kad-close nodeIds when closer nodeIds are found', async () => {
  const tagPeerSpy = jest.spyOn(db.peers, 'updateTag');
  tagPeerSpy.mockClear();
  const taggedPeers = new Set<string>();
  tagPeerSpy.mockImplementation((nodeId, tag, value) => {
    if (value) taggedPeers.add(nodeId);
    else taggedPeers.delete(nodeId);
  });

  const localNodeId = Buffer.from(table.kb.localNodeId);
  const sortedPeerList = createNodeIds(KBUCKET_SIZE + 1).sort((a, b) => {
    return xor(nodeIdToKadId(a), localNodeId).compare(xor(nodeIdToKadId(b), localNodeId));
  });

  // sort list furthest -> closest
  sortedPeerList.reverse();

  // fill the table up to the first kbucket size
  for (let i = 0; i < KBUCKET_SIZE; i++) {
    await table.add(sortedPeerList[i]);
  }

  // should have all added contacts in the root kbucket
  expect(table.kb?.count()).toBe(KBUCKET_SIZE); // did not fill kbuckets'
  expect(table.kb?.root.contacts).toHaveLength(KBUCKET_SIZE); // split root kbucket when we should not have',
  expect(table.kb?.root.left).toBeNull(); // split root kbucket when we should not have
  expect(table.kb?.root.right).toBeNull(); // split root kbucket when we should not have

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (tagPeerSpy.mock.calls.length >= KBUCKET_SIZE) {
      break;
    }
    await new Promise(setImmediate);
  }

  // make sure we tagged all of the nodeIds as kad-close
  for (const peer of taggedPeers) {
    expect(sortedPeerList).toContainEqual(peer);
  }
  tagPeerSpy.mockClear();

  // add a node that is closer than any added so far
  await table.add(sortedPeerList[sortedPeerList.length - 1]);

  expect(table.kb?.count()).toBe(KBUCKET_SIZE + 1); // 'did not fill kbuckets'
  expect(table.kb?.root.left).not.toBeNull(); // 'did not split root kbucket when we should have');
  expect(table.kb?.root.right).not.toBeNull(); // 'did not split root kbucket when we should have'

  // wait for tag new peer and untag old peer
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (tagPeerSpy.mock.calls.length >= 2) {
      break;
    }
    await new Promise(setImmediate);
  }
  // should have updated list of tagged nodeIds
  for (const peer of taggedPeers) {
    const index = sortedPeerList.indexOf(peer);
    // not first one
    expect(index).toBeGreaterThan(0);
  }
});
