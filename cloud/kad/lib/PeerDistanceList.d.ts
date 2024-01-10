/// <reference types="node" />
import NodeId from '../interfaces/NodeId';
/**
 * Maintains a list of nodeIds sorted by distance from a DHT key.
 */
export declare class PeerDistanceList {
    /**
     * The DHT key from which distance is calculated
     */
    private readonly originDhtKey;
    /**
     * The maximum size of the list
     */
    private readonly capacity;
    private peerDistances;
    constructor(originDhtKey: Buffer, capacity: number);
    /**
     * The length of the list
     */
    get length(): number;
    /**
     * The nodeIds in the list, in order of distance from the origin key
     */
    get peers(): NodeId[];
    /**
     * Add a nodeId to the list.
     */
    add(nodeId: NodeId): void;
    /**
     * Indicates whether any of the nodeIds passed as a parameter are closer
     * to the origin key than the furthest nodeId in the PeerDistanceList.
     */
    anyCloser(nodeIds: NodeId[]): boolean;
    private nodeIdToKadId;
}
