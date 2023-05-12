import * as http from 'http';
import type ITypedEventEmitter from '@ulixee/commons/interfaces/ITypedEventEmitter';
import INodeInfo from './INodeInfo';

export default interface IPeerNetwork extends ITypedEventEmitter<IPeerNetworkEvents> {
  start(boostrapList: string[], attachToServer?: http.Server): Promise<IPeerNetwork>;
  close(): Promise<void>;
  provide(sha256Hash: Buffer): Promise<{ providerKey: string }>;
  findProviderNodes(
    sha256Hash: Buffer,
    options?: { maxNumProviders?: number; timeout?: number; abort?: AbortSignal },
  ): AsyncGenerator<INodeInfo>;
  getKnownNodes(maxNodes?: number): Promise<INodeInfo[]>;
  findClosestNodes(
    hash: Buffer,
    options?: { maxPeers?: number; timeout?: number },
  ): Promise<INodeInfo[]>;
}

export interface IPeerNetworkEvents {
  'provide-expired': { hash: Buffer };
}
