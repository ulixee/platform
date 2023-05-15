import { AddressInfo, ListenOptions } from 'net';
import Log from '@ulixee/commons/lib/Logger';
import { bindFunctions, isPortInUse } from '@ulixee/commons/lib/utils';
import ShutdownHandler from '@ulixee/commons/lib/ShutdownHandler';
import Resolvable from '@ulixee/commons/lib/Resolvable';
import IPeerNetwork from '@ulixee/platform-specification/types/IPeerNetwork';
import * as Path from 'path';
import UlixeeHostsConfig from '@ulixee/commons/config/hosts';
import P2pConnection from '@ulixee/cloud-p2p';
import * as Http from 'http';
import CoreRouter from './CoreRouter';
import RoutableServer from './RoutableServer';
import env from '../env';

const pkg = require('../package.json');

const isTestEnv = process.env.NODE_ENV === 'test';

const { log } = Log(module);

export default class CloudNode {
  public readonly publicServer: RoutableServer;
  public readonly hostedServicesServer: RoutableServer;
  public peerServer: Http.Server;
  public peerNetwork?: IPeerNetwork;

  public readonly shouldShutdownOnSignals: boolean = true;

  public readonly router: CoreRouter;

  public get port(): Promise<number> {
    return this.publicServer.port;
  }

  public get address(): Promise<string> {
    return this.publicServer.host;
  }

  public get version(): string {
    return pkg.version;
  }

  private isClosing: Promise<any>;
  private isReady = new Resolvable<void>();
  private didAutoroute = false;

  constructor(
    publicServerIpOrDomain?: string,
    config: {
      servicesServerIpOrDomain?: string;
      shouldShutdownOnSignals?: boolean;
    } = { shouldShutdownOnSignals: true },
  ) {
    bindFunctions(this);

    this.shouldShutdownOnSignals = config.shouldShutdownOnSignals;
    this.publicServer = new RoutableServer(this.isReady.promise, publicServerIpOrDomain);
    if (config.servicesServerIpOrDomain) {
      this.hostedServicesServer = new RoutableServer(
        this.isReady.promise,
        config.servicesServerIpOrDomain,
      );
    }
    this.router = new CoreRouter(this);

    if (config.shouldShutdownOnSignals === true) ShutdownHandler.disableSignals = true;
    ShutdownHandler.register(this.autoClose);
  }

  public async listen(
    publicServerOptions?: ListenOptions,
    hostedServicesOptions?: ListenOptions,
    peerServerOptions?: ListenOptions,
  ): Promise<void> {
    publicServerOptions ??= {};
    hostedServicesOptions ??= {};
    await this.startPublicServer(publicServerOptions);

    if (!hostedServicesOptions.port && !isTestEnv) {
      if (!(await isPortInUse(18181))) hostedServicesOptions.port = 18181;
    }
    await this.hostedServicesServer?.listen(hostedServicesOptions);

    await this.startPeerServices(peerServerOptions);
    await this.router.start(this.publicServer, this.hostedServicesServer, this.peerNetwork);
    // wait until router is registered before accepting traffic
    this.isReady.resolve();
  }

  public async close(closeDependencies = true): Promise<void> {
    if (this.isClosing) return this.isClosing;
    const resolvable = new Resolvable<void>();
    try {
      this.isClosing = resolvable.promise;
      ShutdownHandler.unregister(this.autoClose);
      const logid = log.stats('CloudNode.Closing', {
        closeDependencies,
        sessionId: null,
      });
      if (this.didAutoroute) {
        this.clearReservedPort();
      }

      if (closeDependencies) {
        await this.router.close();
      }

      await this.publicServer.close();
      await this.hostedServicesServer?.close();
      await this.peerServer?.close();
      await this.peerNetwork?.close();
      log.stats('CloudNode.Closed', { parentLogId: logid, sessionId: null });
      resolvable.resolve();
    } catch (error) {
      log.error('Error closing socket connections', {
        error,
        sessionId: null,
      });
      resolvable.reject(error);
    }
    return resolvable.promise;
  }

  private async startPublicServer(publicServerOptions: ListenOptions): Promise<string> {
    const wasOpenPublicPort = !publicServerOptions.port;
    if (wasOpenPublicPort && !isTestEnv) {
      if (!(await isPortInUse(1818))) publicServerOptions.port = 1818;
    }
    const { address, port } = await this.publicServer.listen(publicServerOptions);
    // if we're dealing with local or no configuration, set the local version host
    if (isLocalhost(address) && wasOpenPublicPort && !isTestEnv) {
      // publish port with the version
      await UlixeeHostsConfig.global.setVersionHost(this.version, `localhost:${port}`);
      this.didAutoroute = true;
      ShutdownHandler.register(this.clearReservedPort, true);
    }
    return await this.publicServer.host;
  }

  private clearReservedPort(): void {
    UlixeeHostsConfig.global.setVersionHost(this.version, null);
  }

  private autoClose(): Promise<void> {
    return this.close(true);
  }

  private async startPeerServices(listenOptions: ListenOptions = {}): Promise<void> {
    if (!env.dhtBootstrapPeers?.length && env.cloudType !== 'public') return;
    if (!env.networkIdentity)
      throw new Error(
        'You must configure a PeerNetwork Identity (env.ULX_NETWORK_IDENTITY_PATH) to join a cloud.',
      );

    if (!listenOptions.port && !isTestEnv) {
      if (!(await isPortInUse(18182))) listenOptions.port = 18182;
    }

    this.peerServer = new Http.Server();
    await new Promise<void>(resolve => this.peerServer.listen(listenOptions, resolve));
    const peerPort = (this.peerServer.address() as AddressInfo).port;

    this.peerNetwork = await new P2pConnection().start({
      ulixeeApiHost: await this.publicServer.host,
      dbPath: Path.resolve(this.router.datastoresDir, '../network'),
      port: peerPort,
      ipOrDomain: this.publicServer.hostname,
      identity: env.networkIdentity,
      attachToServer: this.peerServer,
      boostrapList: env.dhtBootstrapPeers,
    });
  }
}

function isLocalhost(address: string): boolean {
  return (
    address === '127.0.0.1' || address === 'localhost' || address === '::' || address === '::1'
  );
}
