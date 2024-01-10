import { Kad } from './Kad';
export interface RoutingTableRefreshInit {
    refreshInterval?: number;
    refreshQueryTimeout?: number;
}
/**
 * A wrapper around `k-bucket`, to provide easy store and
 * retrieval for peers.
 */
export declare class RoutingTableRefresh {
    private readonly logger;
    private readonly peerRouting;
    private readonly routingTable;
    private readonly refreshInterval;
    private readonly refreshQueryTimeout;
    private readonly commonPrefixLengthRefreshedAt;
    private refreshTimeoutId?;
    constructor(kad: Kad);
    start(): Promise<void>;
    stop(): Promise<void>;
    /**
     * To speed lookups, we seed the table with random NodeIds. This means
     * when we are asked to locate a peer on the network, we can find a KadId
     * that is close to the requested peer ID and query that, then network
     * peers will tell us who they know who is close to the fake ID
     */
    refreshTable(force?: boolean): void;
    private refreshCommonPrefixLength;
    private getTrackedCommonPrefixLengthsForRefresh;
    private generateRandomKadKey;
    private makeKadKey;
    /**
     * returns the maximum common prefix length between any peer in the table
     * and the current peer
     */
    private maxCommonPrefix;
    /**
     * Returns the number of peers in the table with a given prefix length
     */
    private numPeersForCpl;
    /**
     * Yields the common prefix length of every peer in the table
     */
    private prefixLengths;
}
