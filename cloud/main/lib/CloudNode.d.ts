import DatastoreCore from '@ulixee/datastore-core';
import IDatastoreCoreConfigureOptions from '@ulixee/datastore-core/interfaces/IDatastoreCoreConfigureOptions';
import DesktopCore from '@ulixee/desktop-core';
import HeroCore from '@ulixee/hero-core';
import ICoreConfigureOptions from '@ulixee/hero-interfaces/ICoreConfigureOptions';
import ICloudConfiguration from '../interfaces/ICloudConfiguration';
import CoreRouter from './CoreRouter';
import NodeRegistry from './NodeRegistry';
import NodeTracker from './NodeTracker';
import RoutableServer from './RoutableServer';
export default class CloudNode {
    static datastorePluginsToRegister: string[];
    publicServer: RoutableServer;
    hostedServicesServer?: RoutableServer;
    hostedServicesHostURL?: URL;
    datastoreCore: DatastoreCore;
    heroCore: HeroCore;
    desktopCore?: DesktopCore;
    nodeRegistry: NodeRegistry;
    nodeTracker: NodeTracker;
    readonly shouldShutdownOnSignals: boolean;
    readonly router: CoreRouter;
    heroConfiguration: ICoreConfigureOptions;
    cloudConfiguration: ICloudConfiguration;
    get datastoreConfiguration(): IDatastoreCoreConfigureOptions;
    set datastoreConfiguration(value: Partial<IDatastoreCoreConfigureOptions>);
    get port(): Promise<number>;
    get host(): Promise<string>;
    get address(): Promise<string>;
    get version(): string;
    private isClosing;
    private isStarting;
    private isReady;
    private didReservePort;
    private connectionsToServicesByHost;
    constructor(config?: Partial<ICloudConfiguration> & {
        shouldShutdownOnSignals?: boolean;
        datastoreConfiguration?: Partial<IDatastoreCoreConfigureOptions>;
        heroConfiguration?: Partial<ICoreConfigureOptions>;
    });
    listen(): Promise<this>;
    close(): Promise<void>;
    private startCores;
    private createConnectionToServiceHost;
    private startPublicServer;
    private clearReservedPort;
    private startHostedServices;
    private getInstalledDatastorePlugins;
    private getServicesSetup;
    private createTemporaryNetworkIdentity;
}