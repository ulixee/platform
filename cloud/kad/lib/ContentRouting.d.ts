/// <reference types="node" />
import INodeInfo from '@ulixee/platform-specification/types/INodeInfo';
import NodeId from '../interfaces/NodeId';
import type { Kad } from './Kad';
import type { IQueryOptions } from './QueryManager';
export declare class ContentRouting {
    private readonly kad;
    private readonly logger;
    private readonly network;
    private readonly peerRouting;
    private readonly queryManager;
    private readonly routingTable;
    private readonly providers;
    constructor(kad: Kad);
    /**
     * Announce to the network that we can provide the value for a given key and
     * are contactable on the given multiaddrs
     */
    provide(key: Buffer, options?: IQueryOptions): AsyncGenerator<{
        notifiedPeer: NodeId;
    }, void, undefined>;
    /**
     * Search the dht for up to `K` providers of the given CID.
     */
    findProviders(key: Buffer, options: IQueryOptions): AsyncGenerator<{
        fromNodeId: NodeId;
        providers: INodeInfo[];
    }>;
}
