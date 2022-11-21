import * as WebSocket from 'ws';
import * as Http from 'http';
import { IncomingMessage } from 'http';
import DataboxCore from '@ulixee/databox-core';
import HeroCore from '@ulixee/hero-core';
import IDataboxCoreConfigureOptions from '@ulixee/databox-core/interfaces/IDataboxCoreConfigureOptions';
import WsTransportToClient from '@ulixee/net/lib/WsTransportToClient';
import ITransportToClient from '@ulixee/net/interfaces/ITransportToClient';
import IConnectionToClient from '@ulixee/net/interfaces/IConnectionToClient';
import ICoreConfigureOptions from '@ulixee/hero-interfaces/ICoreConfigureOptions';
import HttpTransportToClient from '@ulixee/net/lib/HttpTransportToClient';
import { IDataboxApis } from '@ulixee/specification/databox';
import ChromeAliveUtils from './ChromeAliveUtils';
import Miner from '../index';

export default class CoreRouter {
  public static modulesToRegister = [
    '@ulixee/databox-plugins-hero-core/register',
    '@ulixee/databox-plugins-puppeteer-core/register',
  ];

  public heroConfiguration: ICoreConfigureOptions;
  public databoxConfiguration: Partial<IDataboxCoreConfigureOptions>;

  public get dataDir(): string {
    return HeroCore.dataDir;
  }

  public get databoxesDir(): string {
    return DataboxCore.databoxesDir;
  }

  private miner: Miner;
  private readonly connections = new Set<IConnectionToClient<any, any>>();

  private connectionTypes: {
    [key: string]: (transport: ITransportToClient<any>) => IConnectionToClient<any, any>;
  } = {
    hero: transport => HeroCore.addConnection(transport),
    databox: transport => DataboxCore.addConnection(transport),
    chromealive: transport => ChromeAliveUtils.getChromeAlive().addConnection(transport) as any,
  };

  constructor(miner: Miner) {
    this.miner = miner;

    miner.addWsRoute('/', this.handleApi.bind(this, 'hero'));
    miner.addWsRoute('/databox', this.handleApi.bind(this, 'databox'));
    miner.addHttpRoute(/\/databox\/(.+)/, 'GET', this.runDataboxApi.bind(this));

    for (const module of CoreRouter.modulesToRegister) {
      safeRegisterModule(module);
    }

    if (ChromeAliveUtils.isInstalled()) {
      miner.addWsRoute('/chromealive', this.handleApi.bind(this, 'chromealive'));
    }
  }

  public async start(minerAddress: string): Promise<void> {
    HeroCore.onShutdown = () => this.miner.close();
    await HeroCore.start(this.heroConfiguration);

    if (this.databoxConfiguration) {
      Object.assign(DataboxCore.options, this.databoxConfiguration);
    }

    await DataboxCore.start();

    if (ChromeAliveUtils.isInstalled()) {
      const chromeAliveCore = ChromeAliveUtils.getChromeAlive();
      const wsAddress = Promise.resolve(`ws://${minerAddress}/chromealive`);
      chromeAliveCore.setMinerAddress(wsAddress);
      await chromeAliveCore.register();
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

  private handleApi(
    connectionType: keyof CoreRouter['connectionTypes'],
    ws: WebSocket,
    req: IncomingMessage,
  ): void {
    const transport = new WsTransportToClient(ws, req);
    const connection = this.connectionTypes[connectionType](transport);
    if (!connection) throw new Error(`Unknown connection protocol attempted "${connectionType}"`);
    this.connections.add(connection);
    connection.once('disconnected', () => this.connections.delete(connection));
  }

  private async runDataboxApi(req: Http.IncomingMessage, res: Http.ServerResponse): Promise<void> {
    const url = new URL(req.url, 'http://localhost/');

    const input: any = {};
    for (const [key, value] of url.searchParams.entries()) input[key] = value;
    const versionHash = url.pathname.replace('/databox/', '');

    const httpTransport = new HttpTransportToClient<IDataboxApis, {}>(req, res);
    const connection = DataboxCore.addConnection(httpTransport);
    httpTransport.emit('message', {
      command: 'Databox.eec',
      args: {
        versionHash,
        input,
      },
    } as any);
    await connection.disconnect();
  }
}

function safeRegisterModule(path: string): void {
  try {
    // eslint-disable-next-line import/no-dynamic-require
    require(path);
  } catch (err) {
    /* no-op */
  }
}
