import P2pConnection from '@ulixee/cloud-p2p';
import UlixeeHostsConfig from '@ulixee/commons/config/hosts';
import Log from '@ulixee/commons/lib/Logger';
import Resolvable from '@ulixee/commons/lib/Resolvable';
import ShutdownHandler from '@ulixee/commons/lib/ShutdownHandler';
import { bindFunctions, isPortInUse, toUrl } from '@ulixee/commons/lib/utils';
import DatastoreCore from '@ulixee/datastore-core';
import IDatastoreCoreConfigureOptions from '@ulixee/datastore-core/interfaces/IDatastoreCoreConfigureOptions';
import type IExtractorPluginCore from '@ulixee/datastore/interfaces/IExtractorPluginCore';
import type DesktopCore from '@ulixee/desktop-core';
import HeroCore from '@ulixee/hero-core';
import ICoreConfigureOptions from '@ulixee/hero-interfaces/ICoreConfigureOptions';
import IPeerNetwork from '@ulixee/platform-specification/types/IPeerNetwork';
import IServicesSetup from '@ulixee/platform-specification/types/IServicesSetup';
import * as Http from 'http';
import * as Https from 'https';
import { AddressInfo, ListenOptions } from 'net';
import * as Path from 'path';
import env from '../env';
import { ICloudConfiguration } from '../interfaces/ICloudApiContext';
import CoreRouter from './CoreRouter';
import DesktopUtils from './DesktopUtils';
import NodeRegistry from './NodeRegistry';
import NodeTracker from './NodeTracker';
import RoutableServer from './RoutableServer';

const pkg = require('../package.json');

const isTestEnv = process.env.NODE_ENV === 'test';

const { log } = Log(module);

export default class CloudNode {
  public static datastorePluginsToRegister = [
    '@ulixee/datastore-plugins-hero-core',
    '@ulixee/datastore-plugins-puppeteer-core',
  ];

  public readonly publicServer: RoutableServer;
  public readonly hostedServicesServer?: RoutableServer;
  public peerServer: Http.Server;
  public peerNetwork?: IPeerNetwork;

  public datastoreCore: DatastoreCore;
  public desktopCore?: DesktopCore;
  public nodeRegistry: NodeRegistry;
  public nodeTracker: NodeTracker;

  public readonly shouldShutdownOnSignals: boolean = true;

  public readonly router: CoreRouter;

  public heroConfiguration: ICoreConfigureOptions;

  public cloudConfiguration: ICloudConfiguration = {
    nodeRegistryHost: env.nodeRegistryHost,
    cloudType: env.cloudType as any,
    dhtBootstrapPeers: env.dhtBootstrapPeers,
    servicesSetupHost: env.servicesSetupHost,
  };

  public get datastoreConfiguration(): IDatastoreCoreConfigureOptions {
    return this.datastoreCore.options;
  }

  public set datastoreConfiguration(value: Partial<IDatastoreCoreConfigureOptions>) {
    Object.assign(this.datastoreCore.options, value);
  }

  public get port(): Promise<number> {
    return this.publicServer.port;
  }

  public get host(): Promise<string> {
    return this.publicServer.host;
  }

  // @deprecated - use host
  public get address(): Promise<string> {
    return this.publicServer.host;
  }

  public get version(): string {
    return pkg.version;
  }

  private isClosing: Promise<any>;
  private beforeListenCallbacks: (() => Promise<any>)[] = [];
  private isReady = new Resolvable<void>();
  private didReservePort = false;

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
    this.datastoreCore = new DatastoreCore({}, this.getInstalledDatastorePlugins());

    if (config.shouldShutdownOnSignals === true) ShutdownHandler.disableSignals = true;
    ShutdownHandler.register(this.close);
  }

  public beforeListen(callbackFn: () => Promise<any>): void {
    this.beforeListenCallbacks.push(callbackFn);
  }

  public async listen(
    publicServerOptions?: ListenOptions,
    hostedServicesOptions?: ListenOptions,
    peerServerOptions?: ListenOptions,
  ): Promise<void> {
    publicServerOptions ??= {};
    hostedServicesOptions ??= {};

    const startLogId = log.info('CloudNode.start');

    try {
      await this.startPublicServer(publicServerOptions);

      if (!hostedServicesOptions.port && !isTestEnv) {
        if (!(await isPortInUse(18181))) hostedServicesOptions.port = 18181;
      }
      await this.hostedServicesServer?.listen(hostedServicesOptions);

      await this.startPeerServices(peerServerOptions);

      await this.startCores();
      await this.router.register();
      await Promise.all(this.beforeListenCallbacks);
      // wait until router is registered before accepting traffic
      this.isReady.resolve();
    } finally {
      log.stats('CloudNode.started', {
        publicHost: await this.publicServer.host,
        hostedServicesHost: await this.hostedServicesServer?.host,
        peerAddresses: await this.peerNetwork?.multiaddrs,
        cloudConfiguration: this.cloudConfiguration,
        parentLogId: startLogId,
        sessionId: null,
      });
    }
  }

  public async close(): Promise<void> {
    if (this.isClosing) {
      return this.isClosing;
    }
    ShutdownHandler.unregister(this.close);
    const resolvable = new Resolvable<void>();
    const logid = log.stats('CloudNode.Closing');
    try {
      this.isClosing = resolvable.promise;

      if (this.didReservePort) {
        this.clearReservedPort();
      }

      await this.router.close();

      HeroCore.onShutdown = null;
      await this.nodeRegistry?.close();
      this.desktopCore?.disconnect();
      await this.datastoreCore.close();

      await HeroCore.shutdown();

      await this.publicServer.close();
      await this.hostedServicesServer?.close();
      await this.peerServer?.close();
      await this.peerNetwork?.close();
      resolvable.resolve();
    } catch (error) {
      log.error('Error closing socket connections', {
        error,
      });
      resolvable.reject(error);
    } finally {
      log.stats('CloudNode.Closed', { parentLogId: logid, sessionId: null });
    }
    return resolvable.promise;
  }

  private async startCores(): Promise<void> {
    const nodeAddress = toUrl(await this.publicServer.host);
    const hostedServicesAddress = toUrl(await this.hostedServicesServer?.host);

    this.nodeTracker = new NodeTracker();

    this.nodeRegistry = new NodeRegistry({
      datastoreCore: this.datastoreCore,
      publicServer: this.publicServer,
      serviceHost: hostedServicesAddress,
      peerNetwork: this.peerNetwork,
      nodeTracker: this.nodeTracker,
    });
    await this.nodeRegistry.register(nodeAddress, env.networkIdentity);

    /// START HERO
    HeroCore.onShutdown = () => this.close();
    this.heroConfiguration ??= {} as any;
    this.heroConfiguration.shouldShutdownOnSignals ??= this.shouldShutdownOnSignals;
    await HeroCore.start(this.heroConfiguration);

    let servicesSetup: IServicesSetup;
    if (env.servicesSetupHost && nodeAddress.host !== env.servicesSetupHost) {
      servicesSetup = await this.getServicesSetup(env.servicesSetupHost);
    }
    await this.datastoreCore.start({
      nodeAddress,
      hostedServicesAddress,
      defaultServices: servicesSetup,
      peerNetwork: this.peerNetwork,
      cloudType: this.cloudConfiguration.cloudType,
    });

    /// START DESKTOP
    if (DesktopUtils.isInstalled()) {
      const DesktopCore = DesktopUtils.getDesktop();
      this.desktopCore = new DesktopCore(this.datastoreCore);
      await this.desktopCore.activatePlugin();
    }
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
      this.didReservePort = true;
      ShutdownHandler.register(this.clearReservedPort, true);
    }
    return await this.publicServer.host;
  }

  private clearReservedPort(): void {
    UlixeeHostsConfig.global.setVersionHost(this.version, null);
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
      dbPath: Path.resolve(this.datastoreCore.options.datastoresDir, '../network'),
      port: peerPort,
      ipOrDomain: this.publicServer.hostname,
      identity: env.networkIdentity,
      attachToServer: this.peerServer,
      boostrapList: env.dhtBootstrapPeers,
    });
  }

  private getInstalledDatastorePlugins(): IExtractorPluginCore[] {
    return CloudNode.datastorePluginsToRegister
      .map(x => {
        try {
          let Plugin = require(x); // eslint-disable-line import/no-dynamic-require
          Plugin = Plugin.default || Plugin;
          return new Plugin();
        } catch (err) {
          // NOTE: don't warning this by default
          // console.warn('Default Datastore Plugin not installed', path, err.message);
        }
        return null;
      })
      .filter(Boolean);
  }

  private getServicesSetup(servicesHost: string): Promise<IServicesSetup> {
    // default to http
    if (!servicesHost.includes('://')) servicesHost = `http://${servicesHost}`;

    const url = new URL('/', servicesHost);
    const httpModule = url.protocol === 'http:' ? Http : Https;

    return new Promise<IServicesSetup>((resolve, reject) => {
      httpModule
        .get(url, async res => {
          res.on('error', reject);
          res.setEncoding('utf8');
          try {
            let result = '';
            for await (const chunk of res) {
              result += chunk;
            }
            resolve(JSON.parse(result));
          } catch (err) {
            reject(err);
          }
        })
        .on('error', reject)
        .end();
    });
  }
}

function isLocalhost(address: string): boolean {
  return (
    address === '127.0.0.1' || address === 'localhost' || address === '::' || address === '::1'
  );
}
