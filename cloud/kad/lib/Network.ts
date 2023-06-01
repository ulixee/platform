import { IBoundLog } from '@ulixee/commons/interfaces/ILog';
import logger from '@ulixee/commons/lib/Logger';
import TypedEventEmitter from '@ulixee/commons/lib/TypedEventEmitter';
import { toUrl } from '@ulixee/commons/lib/utils';
import { WsTransportToCore } from '@ulixee/net';
import { IKadApiTypes } from '@ulixee/platform-specification/cloud/KadApis';
import INodeInfo from '@ulixee/platform-specification/types/INodeInfo';
import NodeId from '../interfaces/NodeId';
import ConnectionToKadClient from './ConnectionToKadClient';
import ConnectionToKadCore from './ConnectionToKadCore';
import type { Kad } from './Kad';

export class Network extends TypedEventEmitter<{ peer: INodeInfo }> {
  public get connections(): number {
    return Object.keys(this.connectionsByNodeId).length;
  }

  private readonly log: IBoundLog;
  private running: boolean;
  private connectionsByNodeId: { [nodeId: string]: ConnectionToKadCore } = {};

  constructor(private readonly kad: Kad) {
    super();

    this.log = logger(module).log;
    this.running = false;
  }

  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;
  }

  async stop(): Promise<void> {
    this.running = false;
    await Promise.all(Object.values(this.connectionsByNodeId).map(x => x.disconnect()));
  }

  isStarted(): boolean {
    return this.running;
  }

  public async sendRequest<T extends keyof IKadApiTypes & string>(
    to: INodeInfo,
    command: T,
    args: IKadApiTypes[T]['args'],
    options?: { timeoutMs?: number; signal?: AbortSignal },
  ): Promise<IKadApiTypes[T]['result'] & { fromNodeId: NodeId }> {
    if (!this.running) {
      return;
    }

    const connection = await this.dial(to.kadHost ?? to.apiHost, to.nodeId, options);

    await this.kad.routingTable.add(connection.nodeInfo.nodeId);
    this.log.info('Network.sendRequest', { command, toNodeId: to.nodeId, args });
    const result = await connection.sendRequest({
      command,
      args: [args] as any,
      startTime: Date.now(),
    });

    return { ...result, fromNodeId: to.nodeId };
  }

  public async dial(
    address: string,
    nodeId: string,
    options?: { timeoutMs?: number; signal?: AbortSignal },
  ): Promise<ConnectionToKadCore> {
    let connection = this.connectionsByNodeId[nodeId];
    if (!connection) {
      const url = toUrl(address);
      url.pathname = '/kad';
      connection = new ConnectionToKadCore(this.kad, new WsTransportToCore(url.href));
      this.connectionsByNodeId[nodeId] = connection;
      connection.once('disconnected', () => delete this.connectionsByNodeId[nodeId]);
    }

    const error = await connection.connectAndVerify(nodeId, options?.timeoutMs);
    if (error) throw error;
    return connection;
  }

  public async addConnectionToClient(connection: ConnectionToKadClient): Promise<void> {
    const parentLogId = this.log.info('addConnectionToClient.waitFor(verify)', {
      remoteId: connection.transport.remoteId,
    });
    await connection.verifiedPromise;
    this.log.stats('addConnectionToClient.waitFor(verify):resolved', {
      parentLogId,
      nodeInfo: connection.nodeInfo,
      remoteId: connection.transport.remoteId,
    });
    await this.kad.routingTable.add(connection.nodeInfo.nodeId);
  }
}
