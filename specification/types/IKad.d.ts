/// <reference types="node" />
import type ITypedEventEmitter from '@ulixee/commons/interfaces/ITypedEventEmitter';
import type Identity from '@ulixee/crypto/lib/Identity';
import type { ConnectionToClient, ConnectionToCore } from '@ulixee/net';
import { IKadApis } from '../cloud/KadApis';
import INodeInfo from './INodeInfo';
export default interface IKad extends ITypedEventEmitter<IKadEvents> {
    nodeId: string;
    nodeInfo: INodeInfo;
    connectedPeers: number;
    addPeer(node: INodeInfo): Promise<void>;
    start(): Promise<IKad>;
    close(): Promise<void>;
    provide(key: Buffer): Promise<void>;
    findProviderNodes(key: Buffer, options?: {
        maxNumProviders?: number;
        timeout?: number;
        abort?: AbortSignal;
    }): AsyncGenerator<INodeInfo>;
    getKnownNodes(maxNodes?: number): (INodeInfo & {
        lastSeenDate: Date;
    })[];
    findClosestNodes(key: Buffer, options?: {
        maxPeers?: number;
        timeout?: number;
    }): Promise<INodeInfo[]>;
}
export interface IKadEvents {
    'provide-expired': {
        key: Buffer;
        providerNodeId: string;
    };
    'peer-connected': {
        node: INodeInfo;
    };
    'duplex-created': {
        connectionToClient: ConnectionToClient<IKadApis, {}>;
        connectionToCore: ConnectionToCore<IKadApis, {}>;
    };
}
export interface IKadConfig {
    identity: Identity;
    port: number;
    apiHost: string;
    boostrapList: string[];
    ipOrDomain?: string;
    dbPath?: string;
}
