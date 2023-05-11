import * as http from 'http';
import INodeInfo from './INodeInfo';

export default interface IPeerNetwork {
  start(boostrapList: string[], attachToServer?: http.Server): Promise<IPeerNetwork>;
  close(): Promise<void>;
  provide(bucket: string, hash: Buffer): Promise<{ providerKey: string }>;
  findProviderNodes(
    bucket: string,
    hash: Buffer,
    options?: { maxNumProviders?: number; timeout?: number; abort?: AbortSignal },
  ): AsyncGenerator<INodeInfo>;
  getKnownNodes(maxNodes?: number): Promise<INodeInfo[]>;
  findClosestNodes(
    hash: Buffer,
    options?: { maxPeers?: number; timeout?: number },
  ): Promise<INodeInfo[]>;
}
