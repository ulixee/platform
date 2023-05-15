import type ITypedEventEmitter from '@ulixee/commons/interfaces/ITypedEventEmitter';
import type Identity from '@ulixee/crypto/lib/Identity';
import * as http from 'http';
import INodeInfo from './INodeInfo';

type TNodeInfo = INodeInfo & { lastSeenDate: Date };

export default interface IPeerNetwork extends ITypedEventEmitter<IPeerNetworkEvents> {
  nodeId: string;
  multiaddrs: string[];
  connectedPeers: number;

  addPeer(peer: { nodeId?: string; multiaddrs: string[] }): Promise<void>;
  start(options: IPeerNetworkConfig): Promise<IPeerNetwork>;
  close(): Promise<void>;
  provide(sha256Hash: Buffer): Promise<{ providerKey: string }>;
  findProviderNodes(
    sha256Hash: Buffer,
    options?: { maxNumProviders?: number; timeout?: number; abort?: AbortSignal },
  ): AsyncGenerator<INodeInfo>;
  getKnownNodes(maxNodes?: number): Promise<TNodeInfo[]>;
  findClosestNodes(
    hash: Buffer,
    options?: { maxPeers?: number; timeout?: number },
  ): Promise<INodeInfo[]>;
}

export interface IPeerNetworkEvents {
  'provide-expired': { hash: Buffer };
  'node-seen': { node: TNodeInfo };
}

export interface IPeerNetworkConfig {
  identity: Identity;
  port: number;
  ulixeeApiHost: string;
  boostrapList: string[];
  ipOrDomain?: string;
  dbPath?: string;
  attachToServer?: http.Server;
}
