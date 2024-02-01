import Identity from '@ulixee/crypto/lib/Identity';
import DatastoreCore from '@ulixee/datastore-core';
import HeroCore from '@ulixee/hero-core';
import { ConnectionToCore } from '@ulixee/net';
import {
  ICloudNodeMeta,
  INodeRegistryApis,
} from '@ulixee/platform-specification/services/NodeRegistryApis';
import NodeRegistryServiceClient from './NodeRegistryServiceClient';
import NodeTracker from './NodeTracker';
import RoutableServer from './RoutableServer';

export default class NodeRegistry {
  public serviceClient?: NodeRegistryServiceClient;
  public nodeMeta: ICloudNodeMeta;

  private readonly nodeTracker: NodeTracker;

  constructor(
    private config: {
      publicServer: RoutableServer;
      serviceClient?: ConnectionToCore<INodeRegistryApis, {}>;
      nodeTracker: NodeTracker;
      datastoreCore: DatastoreCore;
      heroCore: HeroCore;
    },
  ) {
    const { nodeTracker, serviceClient } = config;
    this.nodeTracker = nodeTracker;


    if (serviceClient) {
      this.serviceClient = new NodeRegistryServiceClient(
        serviceClient,
        this.config.datastoreCore,
        this.config.heroCore,
        () => ({
          clients: this.config.publicServer.connections,
        }),
      );
    }
  }

  public async close(): Promise<void> {
    await this.serviceClient?.close();
    // clear out memory
    this.config = null;
    this.serviceClient = null;
  }

  public async register(identity: Identity): Promise<void> {
    this.nodeMeta = {
      nodeId: identity?.bech32,
      apiHost: await this.config.publicServer.host,
      isClusterNode: true,
      lastSeenDate: new Date(),
    };
    this.nodeTracker.track(this.nodeMeta);

    if (this.serviceClient) {
      if (!identity)
        throw new Error(
          'You must configure a network identity (ULX_NETWORK_IDENTITY_PATH) to use the node registry service.',
        );

      const { nodes } = await this.serviceClient.register(this.nodeMeta);
      for (const node of nodes) {
        this.nodeTracker.track(node);
      }
    }
  }

  public async getNodes(count = 25): Promise<ICloudNodeMeta[]> {
    if (this.nodeTracker.nodes.length < count && this.serviceClient) {
      const clusterNodes = await this.serviceClient.getNodes(count);
      for (const node of clusterNodes.nodes) {
        this.nodeTracker.track(node);
      }
    }

    return this.nodeTracker.nodes.slice(0, count);
  }

}
