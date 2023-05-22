import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';
import DatastoreCore from '@ulixee/datastore-core';
import HeroCore from '@ulixee/hero-core';
import { ConnectionToCore, WsTransportToCore } from '@ulixee/net';
import {
  INodeRegistryApiTypes,
  INodeRegistryApis,
} from '@ulixee/platform-specification/services/NodeRegistryApis';

const MINUTE = 60e3;
export default class NodeRegistryServiceClient {
  client: ConnectionToCore<INodeRegistryApis, {}>;
  hostAddress: URL;
  private lastClusterCheckTimestamp: number;
  private heartbeatInternal: NodeJS.Timeout;
  private eventSubscriber = new EventSubscriber();
  private statsBuckets: { sessions: number; clients: number; queries: number; startDate: Date }[] =
    [];

  private get stats(): { sessions: number; clients: number; queries: number; startDate: Date } {
    return this.statsBuckets[this.statsBuckets.length - 1];
  }

  constructor(
    hostAddress: URL,
    datastoreCore: DatastoreCore,
    private getConnections: () => { clients: number; peers: number },
  ) {
    this.hostAddress = new URL('/services', hostAddress);
    this.client = new ConnectionToCore(new WsTransportToCore(this.hostAddress.href));
    this.heartbeatInternal = setInterval(this.heartbeat.bind(this), 5 * MINUTE) as any;
    this.eventSubscriber.on(HeroCore.events, 'agent-created', () => (this.stats.sessions += 1));
    this.eventSubscriber.on(datastoreCore, 'connection', () => (this.stats.clients += 1));
    this.eventSubscriber.on(datastoreCore, 'query', () => (this.stats.queries += 1));
    this.statsBuckets.push({ sessions: 0, queries: 0, clients: 0, startDate: new Date() });
  }

  async close(): Promise<void> {
    // clear loop
    this.getConnections = null;
    clearInterval(this.heartbeatInternal);
    this.eventSubscriber.close();
    await this.client.disconnect();
  }

  public async getNodes(
    count: number,
  ): Promise<INodeRegistryApiTypes['NodeRegistry.getNodes']['result']> {
    if (!this.shouldReloadNodes()) return { nodes: [] };

    this.lastClusterCheckTimestamp = Date.now();
    return await this.client.sendRequest({
      command: 'NodeRegistry.getNodes',
      args: [{ count }],
    });
  }

  public async register(
    details: INodeRegistryApiTypes['NodeRegistry.register']['args'],
  ): Promise<INodeRegistryApiTypes['NodeRegistry.register']['result']> {
    return await this.client.sendRequest({
      command: 'NodeRegistry.register',
      args: [details],
    });
  }

  private async sendHealth(
    details: INodeRegistryApiTypes['NodeRegistry.health']['args'],
  ): Promise<INodeRegistryApiTypes['NodeRegistry.health']['result']> {
    return await this.client.sendRequest({
      command: 'NodeRegistry.health',
      args: [details],
    });
  }

  private async heartbeat(identity: string): Promise<void> {
    const stats = this.stats;
    this.statsBuckets.push({ sessions: 0, queries: 0, clients: 0, startDate: new Date() });
    const connections = this.getConnections();
    await this.sendHealth({
      identity,
      clientConnections: connections.clients,
      peerConnections: connections.peers,
      coreMetrics: {
        periodStartTime: stats.startDate,
        heroPoolSize: HeroCore.pool.maxConcurrentAgents,
        heroPoolAvailable: HeroCore.pool.maxConcurrentAgents - HeroCore.pool.activeAgentsCount,
        datastoreQueries: stats.queries,
        heroSessions: stats.sessions,
      },
    });
  }

  private shouldReloadNodes(): boolean {
    if (!this.lastClusterCheckTimestamp) return true;
    const elapsedMinutes = Date.now() - this.lastClusterCheckTimestamp;

    return elapsedMinutes >= 10 * MINUTE;
  }
}
