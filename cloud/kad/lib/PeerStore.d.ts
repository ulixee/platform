import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import INodeInfo from '@ulixee/platform-specification/types/INodeInfo';
import KadDb from '../db/KadDb';
export declare class PeerStore extends TypedEventEmitter<{
    new: INodeInfo;
}> {
    private db;
    private lastSeenByNodeId;
    constructor(db: KadDb);
    get(nodeId: string): INodeInfo;
    tag(nodeId: string, tagName: string, value: number): void;
    all(includeLastSeen?: true): (INodeInfo & {
        lastSeenDate: Date;
    })[];
    sawNode(nodeId: string): void;
    nodeVerified(nodeId: string): void;
    add(nodeInfo: INodeInfo, isVerified?: boolean): void;
}
