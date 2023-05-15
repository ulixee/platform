import Identity from '@ulixee/crypto/lib/Identity';
import { ICloudNodeMeta } from '@ulixee/platform-specification/services/NodeRegistryApis';
import IPeerNetwork from '@ulixee/platform-specification/types/IPeerNetwork';
import NodeRegistryServiceClient from './NodeRegistryServiceClient';
import NodeTracker from './NodeTracker';
import RoutableServer from './RoutableServer';

export default class NodeRegistry {
  public serviceClient?: NodeRegistryServiceClient;

  private readonly peerNetwork?: IPeerNetwork;
  private readonly nodeTracker: NodeTracker;

  constructor(
    private config: {
      publicServer: RoutableServer;
      serviceHost?: URL;
      peerNetwork?: IPeerNetwork;
      nodeTracker: NodeTracker;
    },
  ) {
    const { serviceHost, nodeTracker, peerNetwork } = config;
    this.peerNetwork = peerNetwork;
    this.nodeTracker = nodeTracker;

    this.trackPeer = this.trackPeer.bind(this);
    this.nodeTracker.on('new', this.trackPeer);
    this.peerNetwork?.on('node-seen', this.nodeTracker.onSeen);

    if (serviceHost) {
      this.serviceClient = new NodeRegistryServiceClient(serviceHost, () => ({
        clients: this.config.publicServer.connections,
        peers: this.peerNetwork?.connectedPeers ?? 0,
      }));
    }
  }

  public async close(): Promise<void> {
    await this.serviceClient?.close();
    this.nodeTracker.off('new', this.trackPeer);
    this.peerNetwork?.off('node-seen', this.nodeTracker.onSeen);
    // clear out memory
    this.config = null;
    this.serviceClient = null;
  }

  public async register(nodeAddress: URL, identity: Identity): Promise<void> {
    if (!this.serviceClient) return;
    if (!identity)
      throw new Error(
        'You must configure a network identity (ULX_NETWORK_IDENTITY_PATH) to use the node registry service.',
      );

    const { nodes } = await this.serviceClient.register({
      identity: identity.bech32,
      ulixeeApiHost: nodeAddress.host,
      peerMultiaddrs: this.peerNetwork?.multiaddrs,
    });
    for (const node of nodes) {
      this.nodeTracker.track(node);
    }
  }

  public async getNodes(count = 25): Promise<ICloudNodeMeta[]> {
    if (this.nodeTracker.nodes.length < count && this.serviceClient) {
      const clusterNodes = await this.serviceClient.getNodes(count);
      for (const node of clusterNodes.nodes) {
        this.nodeTracker.track(node);
      }
    }

    if (this.nodeTracker.nodes.length < count && this.peerNetwork) {
      const networkNodes = await this.peerNetwork.getKnownNodes(count);
      for (const node of networkNodes) {
        this.nodeTracker.track({
          peerMultiaddrs: node.multiaddrs,
          identity: node.identity,
          ulixeeApiHost: node.ulixeeApiHost,
          lastSeenDate: node.lastSeenDate,
          isClusterNode: false,
        });
      }
    }

    return this.nodeTracker.nodes.slice(0, count);
  }

  private trackPeer(evt: { node: ICloudNodeMeta }): void {
    const { node } = evt;
    if (this.peerNetwork && node.peerMultiaddrs?.length) {
      void this.peerNetwork.addPeer({ multiaddrs: node.peerMultiaddrs }).catch(() => null);
    }
  }
}
