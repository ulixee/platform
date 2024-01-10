"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bufferUtils_1 = require("@ulixee/commons/lib/bufferUtils");
const utils_1 = require("@ulixee/commons/lib/utils");
const Identity_1 = require("@ulixee/crypto/lib/Identity");
const Fs = require("fs");
const Path = require("path");
const KadDb_1 = require("../db/KadDb");
const Kad_1 = require("../lib/Kad");
const PeerStore_1 = require("../lib/PeerStore");
const RoutingTable_1 = require("../lib/RoutingTable");
const _helpers_1 = require("./_helpers");
const dbPath = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'RoutingTable.test', 'kad.db');
let table;
let db;
const network = {
    sendRequest(to, _command, _args) {
        return Promise.resolve(`got something from${to.nodeId}`);
    },
};
const networkSendRequestSpy = jest.spyOn(network, 'sendRequest');
beforeEach(async () => {
    db = new KadDb_1.default(dbPath);
    const peerStore = new PeerStore_1.PeerStore(db);
    const identity = await Identity_1.default.create();
    table = new RoutingTable_1.RoutingTable({
        nodeInfo: {
            nodeId: identity.bech32,
            kadId: (0, Kad_1.nodeIdToKadId)(identity.bech32),
            kadHost: 'localhost:1818',
            apiHost: 'localhost:1818',
        },
        network: network,
        peerStore,
    }, {});
    await table.start();
    networkSendRequestSpy.mockReset();
});
afterEach(async () => {
    await table.stop();
    db.close();
    await Fs.promises.rm(dbPath, { recursive: true });
});
test('can add to the routing table', async () => {
    const ids = (0, _helpers_1.createNodeIds)(20);
    await Promise.all(Array.from({ length: 1000 }).map(async () => {
        await table.add((0, utils_1.pickRandom)(ids));
    }));
    await Promise.all(Array.from({ length: 20 }).map(async () => {
        const id = (0, utils_1.pickRandom)(ids);
        const key = (0, Kad_1.nodeIdToKadId)(id);
        expect(table.closestPeers(key, 5).length).toBeGreaterThan(0);
    }));
});
test('can remove routingTable entries', async () => {
    const nodeIds = (0, _helpers_1.createNodeIds)(10);
    await Promise.all(nodeIds.map(async (peer) => {
        await table.add(peer);
    }));
    const key = (0, Kad_1.nodeIdToKadId)(nodeIds[2]);
    expect(table.closestPeers(key, 10)).toHaveLength(10);
    await table.remove(nodeIds[5]);
    expect(table.closestPeers(key, 10)).toHaveLength(9);
    expect(table.size).toBe(9);
});
test('can find closest peers', async () => {
    const nodeIds = (0, _helpers_1.createNodeIds)(18);
    await Promise.all(nodeIds.map(async (peer) => {
        await table.add(peer);
    }));
    const key = (0, Kad_1.nodeIdToKadId)(nodeIds[2]);
    expect(table.closestPeers(key, 15)).toHaveLength(15);
});
test('favors old nodeIds that respond to pings', async () => {
    let fn;
    // execute queued functions immediately
    table.pingQueue = {
        run: async (f) => {
            fn = f;
        },
        stop() { },
        clear() { },
    };
    const nodeIds = (0, _helpers_1.createNodeIds)(2);
    const oldPeer = {
        id: (0, Kad_1.nodeIdToKadId)(nodeIds[0]),
        nodeId: nodeIds[0],
        vectorClock: 0,
    };
    const newPeer = {
        id: (0, Kad_1.nodeIdToKadId)(nodeIds[1]),
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
    let fn;
    // execute queued functions immediately
    table.pingQueue = {
        run: async (f) => {
            fn = f;
        },
        stop() { },
        clear() { },
    };
    const nodeIds = (0, _helpers_1.createNodeIds)(2);
    const oldPeer = {
        id: (0, Kad_1.nodeIdToKadId)(nodeIds[0]),
        nodeId: nodeIds[0],
        vectorClock: 0,
    };
    const newPeer = {
        id: (0, Kad_1.nodeIdToKadId)(nodeIds[1]),
        nodeId: nodeIds[1],
        vectorClock: 0,
    };
    // @ts-expect-error
    table.onPing([oldPeer], newPeer);
    if (table.kb == null) {
        throw new Error('kbucket not defined');
    }
    networkSendRequestSpy.mockImplementationOnce(() => Promise.reject(new Error('Timeout connecting')));
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
    const remotePeer = Identity_1.default.createSync().bech32;
    const tagPeerSpy = jest.spyOn(db.peers, 'updateTag');
    await table.add(remotePeer);
    await new Promise(resolve => tagPeerSpy.mockImplementationOnce(resolve));
    expect(tagPeerSpy.mock.calls[0][0]).toBe(remotePeer);
    expect(tagPeerSpy.mock.calls[0][1]).toBe(RoutingTable_1.KAD_CLOSE_TAG_NAME);
});
test('removes tags from kad-close nodeIds when closer nodeIds are found', async () => {
    const tagPeerSpy = jest.spyOn(db.peers, 'updateTag');
    tagPeerSpy.mockClear();
    const taggedPeers = new Set();
    tagPeerSpy.mockImplementation((nodeId, tag, value) => {
        if (value)
            taggedPeers.add(nodeId);
        else
            taggedPeers.delete(nodeId);
    });
    const localNodeId = Buffer.from(table.kb.localNodeId);
    const sortedPeerList = (0, _helpers_1.createNodeIds)(RoutingTable_1.KBUCKET_SIZE + 1).sort((a, b) => {
        return (0, bufferUtils_1.xor)((0, Kad_1.nodeIdToKadId)(a), localNodeId).compare((0, bufferUtils_1.xor)((0, Kad_1.nodeIdToKadId)(b), localNodeId));
    });
    // sort list furthest -> closest
    sortedPeerList.reverse();
    // fill the table up to the first kbucket size
    for (let i = 0; i < RoutingTable_1.KBUCKET_SIZE; i++) {
        await table.add(sortedPeerList[i]);
    }
    // should have all added contacts in the root kbucket
    expect(table.kb?.count()).toBe(RoutingTable_1.KBUCKET_SIZE); // did not fill kbuckets'
    expect(table.kb?.root.contacts).toHaveLength(RoutingTable_1.KBUCKET_SIZE); // split root kbucket when we should not have',
    expect(table.kb?.root.left).toBeNull(); // split root kbucket when we should not have
    expect(table.kb?.root.right).toBeNull(); // split root kbucket when we should not have
    // eslint-disable-next-line no-constant-condition
    while (true) {
        if (tagPeerSpy.mock.calls.length >= RoutingTable_1.KBUCKET_SIZE) {
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
    expect(table.kb?.count()).toBe(RoutingTable_1.KBUCKET_SIZE + 1); // 'did not fill kbuckets'
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
//# sourceMappingURL=RoutingTable.test.js.map