/// <reference types="node" />
import Resolvable from '@ulixee/commons/lib/Resolvable';
import INodeInfo from '@ulixee/platform-specification/types/INodeInfo';
import NodeId from '../interfaces/NodeId';
import type { Kad } from './Kad';
import type { RoutingTable } from './RoutingTable';
export interface IQueryManagerInit {
    disjointPaths?: number;
    alpha?: number;
    initialQuerySelfHasRun: Resolvable<void>;
    routingTable: RoutingTable;
}
/**
 * Keeps track of all running queries
 */
export declare class QueryManager {
    private readonly kad;
    disjointPaths: number;
    private readonly alpha;
    private readonly shutDownController;
    private running;
    private activeQueries;
    private queryIdCounter;
    private readonly routingTable;
    private initialQuerySelfHasRun;
    constructor(kad: Pick<Kad, 'nodeId' | 'peerStore'>, init: IQueryManagerInit);
    isStarted(): boolean;
    start(): Promise<void>;
    stop(): Promise<void>;
    runOnClosestPeers<T extends {
        closerPeers?: INodeInfo[];
    } = {
        closerPeers?: INodeInfo[];
    }>(key: Buffer, queryFunc: IKadQueryFn<T>, options?: IQueryOptions): AsyncGenerator<T & {
        fromNodeId: NodeId;
        error?: Error;
    }>;
    /**
     * Walks a path through the DHT, calling the passed query function for
     * every peer encountered that we have not seen before
     *
     * Adds the passed peer to the query queue if it's not us and no
     * other path has passed through this peer
     */
    private queueQueryPeer;
}
export interface IQueryOptions {
    queryTimeout?: number;
    isSelfQuery?: boolean;
    signal?: AbortSignal;
}
export interface IKadQueryFn<T extends {
    closerPeers?: INodeInfo[];
}> {
    (context: {
        key: Buffer;
        nodeInfo: INodeInfo;
        signal: AbortSignal;
    }): Promise<T>;
}
