/// <reference types="node" />
import Queue from '@ulixee/commons/lib/Queue';
import TypedEventEmitter from '@ulixee/commons/lib/TypedEventEmitter';
import KBucket = require('k-bucket');
import NodeId from '../interfaces/NodeId';
import type { Kad } from './Kad';
export declare const KAD_CLOSE_TAG_NAME = "kad-close";
export declare const KAD_CLOSE_TAG_VALUE = 50;
export declare const KBUCKET_SIZE = 20;
export declare const PING_TIMEOUT = 10000;
export declare const PING_CONCURRENCY = 10;
export interface KBucketPeer {
    id: Buffer;
    nodeId: NodeId;
    vectorClock: number;
}
declare type KBucketTree = KBucket<KBucketPeer> & {
    toIterable: () => Iterable<KBucketPeer>;
};
export interface RoutingTableInit {
    kBucketSize?: number;
    pingTimeout?: number;
    pingConcurrency?: number;
    tagName?: string;
    tagValue?: number;
}
/**
 * A wrapper around `k-bucket`, to provide easy store and
 * retrieval for peers.
 */
export declare class RoutingTable extends TypedEventEmitter<{
    'peer:add': {
        nodeId: NodeId;
    };
    'peer:remove': {
        nodeId: NodeId;
    };
}> {
    private readonly kad;
    kBucketSize: number;
    kb?: KBucketTree;
    pingQueue: Queue;
    private readonly logger;
    private readonly pingTimeout;
    private readonly pingConcurrency;
    private running;
    private readonly tagName;
    private readonly tagValue;
    private closestNodeIds;
    constructor(kad: Pick<Kad, 'nodeInfo' | 'peerStore' | 'network'>, init: RoutingTableInit);
    isStarted(): boolean;
    start(): Promise<void>;
    stop(): Promise<void>;
    /**
     * Amount of currently stored peers
     */
    get size(): number;
    /**
     * Retrieve the `count`-closest peers to the given key
     */
    closestPeers(key: Buffer, count?: number): NodeId[];
    /**
     * Add or update the routing table with the given peer
     */
    add(nodeId: NodeId): void;
    /**
     * Remove a given peer from the table
     */
    remove(nodeId: NodeId): void;
    /**
     * Keep track of our k-closest peers and tag them in the peer store as such
     * - this will lower the chances that connections to them get closed when
     * we reach connection limits
     */
    private updatePeerTags;
    private onPeerAdded;
    private onPeerRemoved;
    /**
     * Called on the `ping` event from `k-bucket` when a bucket is full
     * and cannot split.
     *
     * `oldContacts.length` is defined by the `numberOfNodesToPing` param
     * passed to the `k-bucket` constructor.
     *
     * `oldContacts` will not be empty and is the list of contacts that
     * have not been contacted for the longest.
     */
    private onPing;
}
export {};
