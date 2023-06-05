import { CodeError } from '@ulixee/commons/lib/errors';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import INodeInfo from '@ulixee/platform-specification/types/INodeInfo';
import KadDb from '../db/KadDb';

export class PeerStore extends TypedEventEmitter<{ new: INodeInfo }> {
  private lastSeenByNodeId: { [nodeId: string]: Date } = {};

  constructor(private db: KadDb) {
    super();
  }

  public get(nodeId: string): INodeInfo {
    if (!this.db.isOpen) throw new CodeError('Database not open', 'ERR_DB_CLOSED');
    const info = this.db.peers.get(nodeId);
    if (!info) return null;
    const { tags: _t, isVerified: _v, lastSeenDate: _l, ...nodeInfo } = info;
    return nodeInfo;
  }

  public tag(nodeId: string, tagName: string, value: number): void {
    if (!this.db.isOpen) throw new CodeError('Database not open', 'ERR_DB_CLOSED');
    this.db.peers.updateTag(nodeId, tagName, value);
    if (value !== undefined) this.sawNode(nodeId);
  }

  public all(includeLastSeen?: true): (INodeInfo & { lastSeenDate: Date })[];
  public all(includeLastSeen = false): INodeInfo[] {
    return this.db.peers
      .all()
      .map(x => {
        if (!x.isVerified) return null;
        const { nodeId, apiHost, lastSeenDate, kadHost } = x;
        const record: INodeInfo & { lastSeenDate?: Date } = { nodeId, apiHost, kadHost };
        if (includeLastSeen) record.lastSeenDate = lastSeenDate;
        return record;
      })
      .filter(Boolean);
  }

  public sawNode(nodeId: string): void {
    this.lastSeenByNodeId[nodeId] = new Date();
  }

  public nodeVerified(nodeId: string): void {
    if (!this.db.isOpen) throw new CodeError('Database not open', 'ERR_DB_CLOSED');
    this.db.peers.isVerified(nodeId, true);
  }

  public add(nodeInfo: INodeInfo, isVerified = false): void {
    if (!this.lastSeenByNodeId[nodeInfo.nodeId]) this.emit('new', nodeInfo);
    this.sawNode(nodeInfo.nodeId);
    if (!this.db.isOpen) throw new CodeError('Database not open', 'ERR_DB_CLOSED');
    this.db.peers.record({
      ...nodeInfo,
      lastSeenDate: this.lastSeenByNodeId[nodeInfo.nodeId],
      isVerified,
      tags: {},
    });
  }
}
