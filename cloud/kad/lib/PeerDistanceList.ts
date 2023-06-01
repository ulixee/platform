import { xor } from '@ulixee/commons/lib/bufferUtils';
import Identity from '@ulixee/crypto/lib/Identity';
import NodeId from '../interfaces/NodeId';

interface PeerDistance {
  nodeId: NodeId;
  distance: Buffer;
}

/**
 * Maintains a list of nodeIds sorted by distance from a DHT key.
 */
export class PeerDistanceList {
  /**
   * The DHT key from which distance is calculated
   */
  private readonly originDhtKey: Buffer;

  /**
   * The maximum size of the list
   */
  private readonly capacity: number;

  private peerDistances: PeerDistance[];

  constructor(originDhtKey: Buffer, capacity: number) {
    this.originDhtKey = originDhtKey;
    this.capacity = capacity;
    this.peerDistances = [];
  }

  /**
   * The length of the list
   */
  get length(): number {
    return this.peerDistances.length;
  }

  /**
   * The nodeIds in the list, in order of distance from the origin key
   */
  get peers(): NodeId[] {
    return this.peerDistances.map(pd => pd.nodeId);
  }

  /**
   * Add a nodeId to the list.
   */
  add(nodeId: NodeId): void {
    if (this.peerDistances.some(pd => pd.nodeId === nodeId)) {
      return;
    }

    const dhtKey = Identity.getBytes(nodeId);
    const el = {
      nodeId,
      distance: xor(this.originDhtKey, dhtKey),
    };

    this.peerDistances.push(el);
    this.peerDistances.sort((a, b) => Buffer.compare(a.distance, b.distance));
    this.peerDistances = this.peerDistances.slice(0, this.capacity);
  }

  /**
   * Indicates whether any of the nodeIds passed as a parameter are closer
   * to the origin key than the furthest nodeId in the PeerDistanceList.
   */
  anyCloser(nodeIds: NodeId[]): boolean {
    if (nodeIds.length === 0) {
      return false;
    }

    if (this.length === 0) {
      return true;
    }

    const dhtKeys = nodeIds.map(Identity.getBytes);
    const furthestDistance = this.peerDistances[this.peerDistances.length - 1].distance;

    for (const dhtKey of dhtKeys) {
      const keyDistance = xor(this.originDhtKey, dhtKey);

      if (Buffer.compare(keyDistance, furthestDistance) < 0) {
        return true;
      }
    }

    return false;
  }
}
