/// <reference types="node" />
import NodeId from '../interfaces/NodeId';
import { Kad } from './Kad';
import { IKadRecord } from './KadRecord';
import { IQueryOptions } from './QueryManager';
export declare class ContentFetching {
    private readonly kad;
    private readonly logger;
    private readonly queryManager;
    private readonly network;
    constructor(kad: Kad);
    putLocal(key: Buffer, record: IKadRecord, options?: {
        needsVerify: boolean;
        isOwnRecord?: boolean;
    }): Promise<void>;
    /**
     * Attempt to retrieve the value for the given key from
     * the local datastore
     */
    getLocal(key: Buffer): Promise<IKadRecord>;
    /**
     * Store the given key/value pair in the DHT
     */
    put(key: Buffer, record: IKadRecord, options?: IQueryOptions): AsyncGenerator<{
        notifiedPeer: NodeId;
    }, void, undefined>;
    /**
     * Get the value to the given key. Implement proactive caching - "Proactive Caching in the Kademlia DHT" by Gummad
     */
    get(key: Buffer, options?: IQueryOptions): AsyncGenerator<IValueRecord>;
    /**
     * Get the `n` values to the given key without sorting. Includes results with nothing found
     */
    private getMany;
}
interface IValueRecord {
    record: IKadRecord;
    fromNodeId: NodeId;
}
export {};
