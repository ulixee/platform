/// <reference types="node" />
import INodeInfo from '@ulixee/platform-specification/types/INodeInfo';
import NodeId from '../interfaces/NodeId';
import type { Kad } from './Kad';
import type { IQueryOptions } from './QueryManager';
export declare class PeerRouting {
    private readonly kad;
    private readonly logger;
    private get routingTable();
    private get network();
    private get queryManager();
    constructor(kad: Kad);
    /**
     * Search for a peer with the given ID
     */
    findPeer(id: NodeId, options?: IQueryOptions): AsyncGenerator<{
        fromNodeId: NodeId;
        nodeInfo: INodeInfo;
    }>;
    /**
     * Kademlia 'node lookup' operation on a key, which should be a sha256 hash
     */
    getClosestPeers(key: Buffer, options?: IQueryOptions): AsyncGenerator<INodeInfo>;
    /**
     * Get the nearest peers to the given query, but closer than self
     */
    getCloserPeersOffline(key: Buffer, closerThan: NodeId, requestorNodeId: NodeId): INodeInfo[];
}
