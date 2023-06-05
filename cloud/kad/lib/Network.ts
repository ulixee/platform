import { IBoundLog } from '@ulixee/commons/interfaces/ILog';
import logger from '@ulixee/commons/lib/Logger';
import TypedEventEmitter from '@ulixee/commons/lib/TypedEventEmitter';
import { WsTransportToCore } from '@ulixee/net';
import ITransport from '@ulixee/net/interfaces/ITransport';
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

  private readonly logger: IBoundLog;
  private running: boolean;
  private connectionsByNodeId: { [nodeId: string]: ConnectionToKadCore } = {};
  private connectionsByBlindDialHost: { [host: string]: ConnectionToKadCore } = {};

  constructor(private readonly kad: Kad) {
    super();

    this.logger = logger(module).log;
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
    this.connectionsByNodeId = {};
    this.connectionsByBlindDialHost = {};
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
    this.logger.info('Network.sendRequest', { command, toNodeId: to.nodeId, args });
    const result = await connection.sendRequest({
      command,
      args: [args] as any,
      startTime: Date.now(),
    });

    return { ...result, fromNodeId: to.nodeId };
  }

  public async blindDial(
    address: string,
    options?: { timeoutMs?: number; signal?: AbortSignal },
  ): Promise<ConnectionToKadCore> {
    if (!this.running) {
      return;
    }

    address = ConnectionToKadCore.parseUrl(address);
    let connectionToCore = this.connectionsByBlindDialHost[address];
    let isNew = false;
    if (!connectionToCore) {
      connectionToCore = new ConnectionToKadCore(this.kad, new WsTransportToCore(address));
      isNew = true;
    }

    await connectionToCore.connectAndVerify(null, options?.timeoutMs);

    await this.kad.routingTable.add(connectionToCore.nodeInfo.nodeId);

    if (isNew && connectionToCore.nodeInfo) {
      delete this.connectionsByBlindDialHost[address];
      this.trackConnection(connectionToCore, connectionToCore.nodeInfo.nodeId);
      const connectionToClient = connectionToCore.toClient();
      this.kad.emit('duplex-created', { connectionToClient, connectionToCore });
    }
    return connectionToCore;
  }

  public async dial(
    address: string,
    nodeId: string,
    options?: { timeoutMs?: number; signal?: AbortSignal },
  ): Promise<ConnectionToKadCore> {
    if (!this.running) {
      return;
    }

    let connectionToCore = this.connectionsByNodeId[nodeId];
    let isNew = false;
    if (!connectionToCore) {
      address = ConnectionToKadCore.parseUrl(address);
      connectionToCore = new ConnectionToKadCore(this.kad, new WsTransportToCore(address));
      this.trackConnection(connectionToCore, nodeId);
      isNew = true;
    }

    await connectionToCore.connectAndVerify(nodeId, options?.timeoutMs);
    await this.kad.routingTable.add(connectionToCore.nodeInfo.nodeId);
    if (isNew) {
      // register inverse connection
      const connectionToClient = connectionToCore.toClient();
      this.kad.emit('duplex-created', { connectionToClient, connectionToCore });
    }
    return connectionToCore;
  }

  public async addConnectionToClient(transport: ITransport): Promise<ConnectionToKadClient> {
    const connectionToClient = new ConnectionToKadClient(this.kad, transport);

    const log = connectionToClient.logger;
    const parentLogId = log.info('addConnectionToClient.waitFor(verify)');

    await connectionToClient.verifiedPromise;

    const connectionToCore = ConnectionToKadCore.fromClient(this.kad, connectionToClient);
    const peerNodeInfo = connectionToClient.nodeInfo;
    this.trackConnection(connectionToCore, peerNodeInfo.nodeId);

    log.stats('addConnectionToClient.waitFor(verify):resolved', {
      parentLogId,
      nodeInfo: peerNodeInfo,
    });
    await this.kad.routingTable.add(peerNodeInfo.nodeId);
    this.kad.emit('duplex-created', { connectionToClient, connectionToCore });
    return connectionToClient;
  }

  private trackConnection(connection: ConnectionToKadCore, nodeId: string): void {
    this.connectionsByNodeId[nodeId] = connection;
    connection.once('disconnected', () => {
      delete this.connectionsByNodeId[nodeId];
    });
  }
}
