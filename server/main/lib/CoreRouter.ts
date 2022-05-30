import Server from '../index';
import ChromeAliveUtils from './ChromeAliveUtils';
import DataboxCore from '@ulixee/databox-core';
import HeroCore from '@ulixee/hero-core';
import * as WebSocket from 'ws';
import WsTransportToClient from '@ulixee/net/lib/WsTransportToClient';
import ITransportToClient from '@ulixee/net/interfaces/ITransportToClient';
import IConnectionToClient from '@ulixee/net/interfaces/IConnectionToClient';

export default class CoreRouter {
  public get dataDir(): string {
    return HeroCore.dataDir;
  }

  private server: Server;
  private readonly connections: IConnectionToClient<any, any>[] = [];

  private connectionTypes: {
    [key: string]: (transport: ITransportToClient<any>) => IConnectionToClient<any, any>;
  } = {
    hero: transport => HeroCore.addConnection(transport),
    databox: transport => DataboxCore.addConnection(transport),
    chromealive: transport => ChromeAliveUtils.getChromeAlive().addConnection(transport),
  };

  constructor(server: Server) {
    this.server = server;

    server.addWsRoute('/', this.handleApi.bind(this, 'hero'));
    server.addWsRoute('/databox', this.handleApi.bind(this, 'databox'));
    try {
      // eslint-disable-next-line import/no-extraneous-dependencies
      require('@ulixee/databox-for-hero-core/register');
    } catch (err) {}

    if (ChromeAliveUtils.isInstalled()) {
      server.addWsRoute('/chromealive', this.handleApi.bind(this, 'chromealive'));
    }
  }

  public async start(serverAddress: string): Promise<void> {
    await HeroCore.start();
    await DataboxCore.start(this.dataDir);
    if (ChromeAliveUtils.isInstalled()) {
      const wsAddress = Promise.resolve(`ws://${serverAddress}/chromealive`);
      ChromeAliveUtils.getChromeAlive().setCoreServerAddress(wsAddress);
    }
  }

  public async close(): Promise<void> {
    for (const connection of this.connections) {
      await connection.disconnect();
    }
    if (ChromeAliveUtils.isInstalled()) {
      await ChromeAliveUtils.getChromeAlive().shutdown();
    }
    await DataboxCore.close();
    await HeroCore.shutdown();
  }

  private handleApi(connectionType: keyof CoreRouter['connectionTypes'], ws: WebSocket): void {
    const transport = new WsTransportToClient(ws);
    const connection = this.connectionTypes[connectionType](transport);
    this.connections.push(connection);
  }
}
