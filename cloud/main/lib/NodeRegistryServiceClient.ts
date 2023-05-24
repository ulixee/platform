import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';
import DatastoreCore from '@ulixee/datastore-core';
import HeroCore from '@ulixee/hero-core';
import { ConnectionToCore } from '@ulixee/net';
import {
  INodeRegistryApis,
  INodeRegistryApiTypes,
} from '@ulixee/platform-specification/services/NodeRegistryApis';

const MINUTE = 60e3;
export default class NodeRegistryServiceClient {
  client: ConnectionToCore<INodeRegistryApis, {}>;
  private lastClusterCheckTimestamp: number;
  private heartbeatInternal: NodeJS.Timeout;
  private eventSubscriber = new EventSubscriber();
  private statsBuckets: { sessions: number; clients: number; queries: number; startDate: Date }[] =
    [];

  private get stats(): { sessions: number; clients: number; queries: number; startDate: Date } {
    return this.statsBuckets[this.statsBuckets.length - 1];
  }

  constructor(
    connectionToCore: ConnectionToCore<INodeRegistryApis, {}>,
    datastoreCore: DatastoreCore,
    private heroCore: HeroCore,
    private getConnections: () => { clients: number; peers: number },
  ) {
    this.client = connectionToCore;
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
    this.heroCore = null;
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
        heroPoolSize: this.heroCore.pool.maxConcurrentAgents,
        heroPoolAvailable:
          this.heroCore.pool.maxConcurrentAgents - this.heroCore.pool.activeAgentsCount,
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
