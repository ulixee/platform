/// <reference types="node" />
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import Identity from '@ulixee/crypto/lib/Identity';
import type ITransport from '@ulixee/net/interfaces/ITransport';
import IKad, { IKadConfig, IKadEvents } from '@ulixee/platform-specification/types/IKad';
import INodeInfo from '@ulixee/platform-specification/types/INodeInfo';
import KadDb from '../db/KadDb';
import IKadOptions from '../interfaces/IKadOptions';
import NodeId from '../interfaces/NodeId';
import ConnectionToKadClient from './ConnectionToKadClient';
import { ContentFetching } from './ContentFetching';
import { ContentRouting } from './ContentRouting';
import { IKadRecord } from './KadRecord';
import { Network } from './Network';
import { PeerRouting } from './PeerRouting';
import { PeerStore } from './PeerStore';
import { Providers } from './Providers';
import { QueryManager } from './QueryManager';
import { QuerySelf } from './QuerySelf';
import { RoutingTable } from './RoutingTable';
/**
 * A DHT implementation modelled after Kademlia with S/Kademlia modifications.
 * Original implementation in go: https://github.com/libp2p/go-libp2p-kad-dht.
 */
export declare class Kad extends TypedEventEmitter<IKadEvents> implements IKad {
    private init;
    routingTable: RoutingTable;
    providers: Providers;
    network: Network;
    peerRouting: PeerRouting;
    db: KadDb;
    nodeInfo: INodeInfo & {
        kadId: Buffer;
    };
    peerStore: PeerStore;
    identity: Identity;
    readonly contentRouting: ContentRouting;
    readonly contentFetching: ContentFetching;
    readonly queryManager: QueryManager;
    readonly querySelf: QuerySelf;
    get nodeHost(): string;
    get nodeId(): string;
    get connectedPeers(): number;
    private connectedToNodesPromise;
    private logger;
    private running;
    private readonly kBucketSize;
    private closeAbortController;
    private readonly routingTableRefresh;
    constructor(init: IKadOptions & IKadConfig);
    addConnection(transport: ITransport): Promise<ConnectionToKadClient>;
    ensureNetworkConnected(): Promise<void>;
    /**
     * Is this DHT running.
     */
    isStarted(): boolean;
    /**
     * Start listening to incoming connections.
     */
    start(): Promise<this>;
    /**
     * Stop accepting incoming connections and sending outgoing
     * messages.
     */
    close(): Promise<void>;
    getKnownNodes(maxNodes?: number): (INodeInfo & {
        lastSeenDate: Date;
    })[];
    /**
     * Uses XOR distance to find closest peers. Auto-converts to sha256 of key
     */
    findClosestNodes(hash: Buffer): Promise<INodeInfo[]>;
    broadcast(_content: Buffer): Promise<boolean>;
    /**
     * Uses XOR distance to find closest peers. Auto-converts to sha256 of key
     */
    findPeer(nodeId: NodeId): Promise<INodeInfo>;
    /**
     * Search the dht for up to `K` providers of the given CID.
     */
    findProviderNodes(key: Buffer, { timeout, signal }?: {
        timeout?: number;
        signal?: AbortSignal;
    }): AsyncGenerator<INodeInfo>;
    get(key: Buffer, { timeout, signal }?: {
        timeout?: number;
        signal?: AbortSignal;
    }): AsyncIterable<IKadRecord>;
    put(key: Buffer, record: IKadRecord, { minPutPeers, timeout, signal }?: {
        minPutPeers?: number;
        timeout?: number;
        signal?: AbortSignal;
    }): AsyncIterable<{
        putToPeer: NodeId;
    }>;
    /**
     * Announce to the network that we can provide given key's value.
     */
    provide(key: Buffer): Promise<void>;
    addPeer(node: INodeInfo): Promise<void>;
    refreshRoutingTable(): Promise<void>;
    private onProvideExpired;
    private onPeer;
}
export declare function nodeIdToKadId(id: string): Buffer;
