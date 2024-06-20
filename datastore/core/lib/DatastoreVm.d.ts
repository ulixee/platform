import Datastore, { ConnectionToDatastoreCore } from '@ulixee/datastore';
import type IExtractorPluginCore from '@ulixee/datastore/interfaces/IExtractorPluginCore';
import IStorageEngine from '@ulixee/datastore/interfaces/IStorageEngine';
import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import DatastoreApiClients from './DatastoreApiClients';
export default class DatastoreVm {
    readonly plugins: IExtractorPluginCore[];
    static doNotCacheList: Set<string>;
    private compiledScriptsByPath;
    private readonly connectionToDatastoreCore;
    private readonly apiClientCache;
    private readonly whitelist;
    constructor(connectionToDatastoreCore: ConnectionToDatastoreCore, apiClientCache: DatastoreApiClients, plugins: IExtractorPluginCore[]);
    getDatastore(path: string): Promise<Datastore>;
    open(path: string, storage: IStorageEngine, manifest: IDatastoreManifest): Promise<Datastore>;
    private getDefaultContext;
    private getVMScript;
    private buildCustomRequire;
}
