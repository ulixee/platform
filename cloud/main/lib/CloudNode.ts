import UlixeeHostsConfig from '@ulixee/commons/config/hosts';
import { getDataDirectory } from '@ulixee/commons/lib/dirUtils';
import Log from '@ulixee/commons/lib/Logger';
import Resolvable from '@ulixee/commons/lib/Resolvable';
import ShutdownHandler from '@ulixee/commons/lib/ShutdownHandler';
import { bindFunctions, isPortInUse, toUrl } from '@ulixee/commons/lib/utils';
import DatastoreCore from '@ulixee/datastore-core';
import IDatastoreCoreConfigureOptions from '@ulixee/datastore-core/interfaces/IDatastoreCoreConfigureOptions';
import type IExtractorPluginCore from '@ulixee/datastore/interfaces/IExtractorPluginCore';
import DesktopCore from '@ulixee/desktop-core';
import HeroCore from '@ulixee/hero-core';
import ICoreConfigureOptions from '@ulixee/hero-interfaces/ICoreConfigureOptions';
import { ConnectionToCore, WsTransportToCore } from '@ulixee/net';
import IServicesSetup from '@ulixee/platform-specification/types/IServicesSetup';
import Ed25519 from '@ulixee/platform-utils/lib/Ed25519';
import Identity from '@ulixee/platform-utils/lib/Identity';
import * as Http from 'http';
import * as Https from 'https';
import * as Path from 'path';
import Env from '../env';
import ICloudConfiguration from '../interfaces/ICloudConfiguration';
import CoreRouter from './CoreRouter';
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

  public publicServer: RoutableServer;
  public hostedServicesServer?: RoutableServer;
  public hostedServicesHostURL?: URL;

  public datastoreCore: DatastoreCore;
  public heroCore: HeroCore;
  public desktopCore?: DesktopCore;
  public nodeRegistry: NodeRegistry;
  public nodeTracker: NodeTracker;

  public readonly shouldShutdownOnSignals: boolean = true;

  public readonly router: CoreRouter;

  public heroConfiguration: ICoreConfigureOptions;

  public cloudConfiguration: ICloudConfiguration = {
    nodeRegistryHost: Env.nodeRegistryHost,
    servicesSetupHost: Env.servicesSetupHost,
    networkIdentity: Env.networkIdentity,
    port: Env.publicPort ? Number(Env.publicPort) : undefined,
    host: Env.listenHostname,
    publicHost: Env.publicHost,
    disableDesktopCore: Env.disableDesktopApi,
    hostedServicesServerOptions:
      (Env.hostedServicesPort ?? Env.hostedServicesListenHostname)
        ? {
            port: Env.hostedServicesPort ? Number(Env.hostedServicesPort) : undefined,
            host: Env.hostedServicesListenHostname,
          }
        : null,
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
  private isStarting: Resolvable<this>;
  private isReady = new Resolvable<void>();
  private didReservePort = false;

  private connectionsToServicesByHost: { [host: string]: ConnectionToCore<any, any> } = {};

  constructor(
    config: Partial<ICloudConfiguration> & {
      shouldShutdownOnSignals?: boolean;
      datastoreConfiguration?: Partial<IDatastoreCoreConfigureOptions>;
      heroConfiguration?: Partial<ICoreConfigureOptions>;
    } = { shouldShutdownOnSignals: true },
  ) {
    bindFunctions(this);

    const {
      heroConfiguration,
      datastoreConfiguration,
      shouldShutdownOnSignals,
      ...cloudConfiguration
    } = config;

    const { hostedServicesServerOptions, ...other } = cloudConfiguration;
    Object.assign(this.cloudConfiguration, other ?? {});
    if (hostedServicesServerOptions) {
      this.cloudConfiguration.hostedServicesServerOptions ??= {};
      Object.assign(
        this.cloudConfiguration.hostedServicesServerOptions,
        hostedServicesServerOptions ?? {},
      );
    }

    this.router = new CoreRouter(this);
    this.datastoreCore = new DatastoreCore(
      datastoreConfiguration ?? {},
      this.getInstalledDatastorePlugins(),
    );

    this.heroConfiguration = heroConfiguration ?? {};
    this.heroConfiguration.shouldShutdownOnSignals ??= this.shouldShutdownOnSignals;
    this.heroCore = new HeroCore(this.heroConfiguration);

    this.shouldShutdownOnSignals = shouldShutdownOnSignals;
    if (this.shouldShutdownOnSignals === true) ShutdownHandler.disableSignals = true;
    ShutdownHandler.register(this.close);
  }

  public async listen(): Promise<this> {
    if (this.isStarting) return this.isStarting;
    const startLogId = log.info('CloudNode.start');
    this.isStarting = new Resolvable<this>();

    try {
      await this.startPublicServer();
      await this.startHostedServices();

      await this.startCores();
      // NOTE: must wait for cores to be available
      await this.router.register();
      // wait until router is registered before accepting traffic
      this.isReady.resolve();
    } finally {
      this.isStarting.resolve(this);
      log.stats('CloudNode.started', {
        publicHost: await this.publicServer.host,
        hostedServicesHost: await this.hostedServicesServer?.host,
        cloudConfiguration: this.cloudConfiguration,
        parentLogId: startLogId,
        sessionId: null,
      });
    }
    return this;
  }

  public async close(): Promise<void> {
    if (this.isClosing) {
      return this.isClosing;
    }
    const resolvable = new Resolvable<void>();
    const logid = log.stats('CloudNode.Closing');
    try {
      this.isClosing = resolvable.promise;

      ShutdownHandler.unregister(this.close);
      this.heroCore.off('close', this.close);

      if (this.didReservePort) {
        this.clearReservedPort();
      }

      await this.router.close();

      await this.nodeRegistry?.close();
      this.desktopCore?.disconnect();

      await this.heroCore.close();
      await this.datastoreCore.close();

      await Promise.allSettled([
        ...Object.values(this.connectionsToServicesByHost).map(x => x.disconnect()),
        this.publicServer.close(),
        this.hostedServicesServer?.close(),
      ]);
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

    if (this.cloudConfiguration.nodeRegistryHost === 'self') {
      this.cloudConfiguration.nodeRegistryHost = hostedServicesAddress.host;
    }

    let servicesSetup: IServicesSetup;
    const setupHost = toUrl(this.cloudConfiguration.servicesSetupHost);
    // don't dial self
    if (
      setupHost &&
      nodeAddress.host !== setupHost.host &&
      hostedServicesAddress?.host !== setupHost.host
    ) {
      servicesSetup = await this.getServicesSetup(setupHost.host);
      this.cloudConfiguration.nodeRegistryHost ??= servicesSetup.nodeRegistryHost;
      log.info('CloudNode.servicesSetup', { servicesSetup, sessionId: null });
    }

    this.nodeTracker = new NodeTracker();
    this.nodeRegistry = new NodeRegistry({
      datastoreCore: this.datastoreCore,
      heroCore: this.heroCore,
      publicServer: this.publicServer,
      serviceClient: this.createConnectionToServiceHost(this.cloudConfiguration.nodeRegistryHost),
      nodeTracker: this.nodeTracker,
    });

    if (
      (this.nodeRegistry.serviceClient || this.cloudConfiguration.nodeRegistryHost) &&
      !this.cloudConfiguration.networkIdentity
    ) {
      await this.createTemporaryNetworkIdentity();
    }
    await this.nodeRegistry.register(this.cloudConfiguration.networkIdentity);

    await this.heroCore.start();
    this.heroCore.once('close', this.close);

    await this.datastoreCore.start({
      nodeAddress,
      networkIdentity: this.cloudConfiguration.networkIdentity,
      hostedServicesAddress,
      defaultServices: servicesSetup,
      createConnectionToServiceHost: this.createConnectionToServiceHost,
      getSystemCore: (name: 'heroCore' | 'datastoreCore' | 'desktopCore') => {
        if (name === 'heroCore') return this.heroCore;
        if (name === 'datastoreCore') return this.datastoreCore;
        if (name === 'desktopCore') return this.desktopCore;
      },
    });

    /// START DESKTOP
    if (this.cloudConfiguration.disableDesktopCore !== true) {
      this.desktopCore = new DesktopCore(this.datastoreCore, this.heroCore);
      this.desktopCore.activatePlugin();
    }
  }

  private createConnectionToServiceHost(serviceHost: string): ConnectionToCore<any, any> {
    const serviceURL = toUrl(serviceHost);
    if (!serviceURL) return null;

    const hostURL = new URL('/services', serviceURL);

    // safeguard against looping back to self
    if (!hostURL || this.hostedServicesHostURL?.origin === hostURL.origin) return null;

    this.connectionsToServicesByHost[hostURL.host] ??= new ConnectionToCore<any, any>(
      new WsTransportToCore(hostURL.href),
    );
    return this.connectionsToServicesByHost[hostURL.host];
  }

  private async startPublicServer(): Promise<string> {
    const listenOptions = this.cloudConfiguration;

    this.publicServer = new RoutableServer(this.isReady.promise, listenOptions.publicHost);
    const isPortUnreserved = !listenOptions.port;
    if (isPortUnreserved && !isTestEnv) {
      if (!(await isPortInUse(1818))) listenOptions.port = 1818;
    }
    const { address, port } = await this.publicServer.listen(listenOptions);
    // if we're dealing with local or no configuration, set the local version host
    if (isLocalhost(address) && isPortUnreserved && !isTestEnv) {
      // publish port with the version
      UlixeeHostsConfig.global.setVersionHost(this.version, `localhost:${port}`);
      this.didReservePort = true;
      ShutdownHandler.register(this.clearReservedPort, true);
    }
    return await this.publicServer.host;
  }

  private clearReservedPort(): void {
    UlixeeHostsConfig.global.setVersionHost(this.version, null);
  }

  private async startHostedServices(): Promise<void> {
    const listenOptions = this.cloudConfiguration.hostedServicesServerOptions;
    if (!listenOptions) return;

    this.hostedServicesServer = new RoutableServer(
      this.isReady.promise,
      this.cloudConfiguration.publicHost,
    );
    if (!listenOptions.port && !isTestEnv) {
      if (!(await isPortInUse(18181))) listenOptions.port = 18181;
    }
    await this.hostedServicesServer.listen(listenOptions);
    this.hostedServicesHostURL = toUrl(await this.hostedServicesServer.host);
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
    const url = new URL('/', toUrl(servicesHost));
    if (url.protocol !== 'http:' && url.protocol !== 'https:') url.protocol = 'http:';
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

  private async createTemporaryNetworkIdentity(): Promise<void> {
    const tempIdentity = await Identity.create();
    this.cloudConfiguration.networkIdentity = tempIdentity;
    const key = Ed25519.getPrivateKeyBytes(tempIdentity.privateKey);
    const path = Path.join(getDataDirectory(), 'ulixee', 'networkIdentity.pem');
    console.warn(`\n
############################################################################################
############################################################################################
###########################  TEMPORARY NETWORK IDENTITY  ###################################
############################################################################################
############################################################################################

            A temporary networkIdentity has been installed on your server. 

       To create a long-term network identity, you should save and use this Identity 
                          from your local system:

 npx @ulixee/platform-utils save-identity --privateKey=${key.toString('base64')} --filename="${path}"

--------------------------------------------------------------------------------------------
       
           To dismiss this message, add the following environment variable:
           
 ULX_NETWORK_IDENTITY_PATH="${path}",

############################################################################################
############################################################################################
############################################################################################
\n\n`);
  }
}

function isLocalhost(address: string): boolean {
  return (
    address === '127.0.0.1' || address === 'localhost' || address === '::' || address === '::1'
  );
}
