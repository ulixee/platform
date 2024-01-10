/// <reference types="node" />
import TypedEventEmitter from '@ulixee/commons/lib/TypedEventEmitter';
import Identity from '@ulixee/crypto/lib/Identity';
import type IExtractorPluginCore from '@ulixee/datastore/interfaces/IExtractorPluginCore';
import { ConnectionToCore } from '@ulixee/net';
import ITransport from '@ulixee/net/interfaces/ITransport';
import ApiRegistry from '@ulixee/net/lib/ApiRegistry';
import { IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import { IServicesSetupApiTypes } from '@ulixee/platform-specification/services/SetupApis';
import { IncomingMessage, ServerResponse } from 'http';
import { TConnectionToServicesClient } from './endpoints/HostedServicesEndpoints';
import IDatastoreApiContext from './interfaces/IDatastoreApiContext';
import IDatastoreConnectionToClient from './interfaces/IDatastoreConnectionToClient';
import IDatastoreCoreConfigureOptions from './interfaces/IDatastoreCoreConfigureOptions';
import DatastoreApiClients from './lib/DatastoreApiClients';
import DatastoreRegistry from './lib/DatastoreRegistry';
import DatastoreVm from './lib/DatastoreVm';
import SidechainClientManager from './lib/SidechainClientManager';
import StatsTracker from './lib/StatsTracker';
import StorageEngineRegistry from './lib/StorageEngineRegistry';
import WorkTracker from './lib/WorkTracker';
export default class DatastoreCore extends TypedEventEmitter<{
    new: {
        datastore: IDatastoreApiTypes['Datastore.meta']['result'];
        activity: 'started' | 'uploaded';
    };
    stats: Pick<IDatastoreApiTypes['Datastore.meta']['result'], 'stats' | 'version' | 'id'>;
    query: {
        id: string;
        version: string;
    };
    connection: {
        connection: IDatastoreConnectionToClient;
    };
    stopped: {
        id: string;
        version: string;
    };
}> {
    pluginCoresByName: {
        [name: string]: IExtractorPluginCore;
    };
    connections: Set<IDatastoreConnectionToClient>;
    get datastoresDir(): string;
    get queryHeroSessionsDir(): string;
    readonly options: IDatastoreCoreConfigureOptions;
    isClosing: Promise<void>;
    workTracker: WorkTracker;
    apiRegistry: ApiRegistry<IDatastoreApiContext>;
    datastoreRegistry: DatastoreRegistry;
    statsTracker: StatsTracker;
    storageEngineRegistry: StorageEngineRegistry;
    sidechainClientManager: SidechainClientManager;
    datastoreApiClients: DatastoreApiClients;
    vm: DatastoreVm;
    private isStarted;
    private docPages;
    private cloudNodeAddress;
    private cloudNodeIdentity;
    private hostedServicesEndpoints;
    private connectionToThisCore;
    constructor(options: Partial<IDatastoreCoreConfigureOptions>, plugins?: IExtractorPluginCore[]);
    addConnection(transport: ITransport): IDatastoreConnectionToClient;
    addHostedServicesConnection(transport: ITransport): TConnectionToServicesClient;
    registerHttpRoutes(addHttpRoute: (route: string | RegExp, method: 'GET' | 'OPTIONS' | 'POST' | 'UPDATE' | 'DELETE', callbackFn: IHttpHandleFn) => any): void;
    start(options: {
        nodeAddress: URL;
        hostedServicesAddress?: URL;
        cloudType?: 'public' | 'private';
        defaultServices?: IServicesSetupApiTypes['Services.getSetup']['result'];
        networkIdentity: Identity;
        getSystemCore: (name: 'heroCore' | 'datastoreCore' | 'desktopCore') => any;
        createConnectionToServiceHost: (host: string) => ConnectionToCore<any, any>;
    }): Promise<void>;
    copyDbxToStartDir(path: string): Promise<void>;
    close(): Promise<void>;
    private onDatastoreInstalled;
    private onNewDatastore;
    private onDatastoreStopped;
    private onDatastoreStats;
    private getApiContext;
    private showTemporaryAdminIdentityPrompt;
}
declare type IHttpHandleFn = (req: IncomingMessage, res: ServerResponse, params: string[]) => Promise<boolean | void>;
export {};
