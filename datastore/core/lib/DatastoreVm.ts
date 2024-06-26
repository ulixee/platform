import { SourceMapSupport } from '@ulixee/commons/lib/SourceMapSupport';
import { isSemverSatisfied } from '@ulixee/commons/lib/VersionUtils';
import Datastore, { ConnectionToDatastoreCore, Crawler } from '@ulixee/datastore';
import IDatastoreHostLookup from '@ulixee/datastore/interfaces/IDatastoreHostLookup';
import type IExtractorPluginCore from '@ulixee/datastore/interfaces/IExtractorPluginCore';
import IPaymentService from '@ulixee/datastore/interfaces/IPaymentService';
import IStorageEngine from '@ulixee/datastore/interfaces/IStorageEngine';
import DatastoreApiClients from '@ulixee/datastore/lib/DatastoreApiClients';
import Extractor from '@ulixee/datastore/lib/Extractor';
import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import { promises as Fs, readFileSync } from 'fs';
import { Script } from 'node:vm';
import * as Path from 'path';
import { Context, createContext } from 'vm';

const { version } = require('../package.json');

export default class DatastoreVm {
  public static doNotCacheList = new Set<string>();
  private compiledScriptsByPath = new Map<string, Promise<Script>>();
  private readonly connectionToDatastoreCore: ConnectionToDatastoreCore;
  private readonly apiClientCache: DatastoreApiClients;
  private readonly whitelist: Set<string>;

  constructor(
    connectionToDatastoreCore: ConnectionToDatastoreCore,
    apiClientCache: DatastoreApiClients,
    readonly plugins: IExtractorPluginCore[],
    readonly datastoreLookup: IDatastoreHostLookup,
    private remotePaymentService?: IPaymentService,
  ) {
    this.apiClientCache = apiClientCache;
    this.connectionToDatastoreCore = connectionToDatastoreCore;

    this.whitelist = new Set([
      ...this.plugins.map(x => x.nodeVmRequireWhitelist || []).flat(),
      '@ulixee/datastore',
      '@ulixee/*-plugin',
      '@ulixee/net',
      '@ulixee/commons',
      '@ulixee/schema',
      '@ulixee/platform-specification',
    ]);
  }

  public async getDatastore(path: string): Promise<Datastore> {
    const script = await this.getVMScript(path);
    const customRequire = this.buildCustomRequire(path);
    const moduleExports = {};
    const ctx = createContext(
      {
        ...this.getDefaultContext(),
        require: customRequire,
        module: { exports: moduleExports },
        exports: moduleExports,
      },
      { name: path },
    );
    let datastore = script.runInContext(ctx) as Datastore;
    if (datastore instanceof Extractor) {
      const extractor = datastore;
      datastore = new Datastore({
        extractors: { [extractor.name ?? 'default']: extractor },
      }) as Datastore;
    } else if (datastore instanceof Crawler) {
      const crawler = datastore;
      datastore = new Datastore({
        crawlers: { [crawler.name ?? 'default']: crawler },
      }) as Datastore;
    }
    return datastore;
  }

  public async open(
    path: string,
    storage: IStorageEngine,
    manifest: IDatastoreManifest,
  ): Promise<Datastore> {
    if (!isSemverSatisfied(manifest.coreVersion, version)) {
      throw new Error(
        `The current version of Core (${version}) is incompatible with this Datastore version (${manifest.coreVersion})`,
      );
    }

    const datastore = await this.getDatastore(path);

    if (!(datastore instanceof Datastore)) {
      throw new Error(
        'The default export from this script needs to inherit from "@ulixee/datastore"',
      );
    }
    await this.remotePaymentService?.whitelistRemotes?.(datastore.metadata, this.datastoreLookup);

    await datastore.bind({
      connectionToCore: this.connectionToDatastoreCore,
      storageEngine: storage,
      manifest,
      apiClientLoader: this.apiClientCache.get.bind(this.apiClientCache),
      datastoreHostLookup: this.datastoreLookup,
      remotePaymentService: this.remotePaymentService,
    });

    return datastore;
  }

  private getDefaultContext(): any {
    return {
      ...global,
      Date,
      RegExp,
      Error,
      Number,
      String,
      Boolean,
      BigInt,
      URL,
      Map,
      Set,
      Array,
      Buffer,
      Symbol,
      process: {
        ...process,
        env: undefined,
        exit: undefined,
      },
      console,
    };
  }

  private getVMScript(path: string): Promise<Script> {
    path = Path.resolve(path);
    if (this.compiledScriptsByPath.has(path) && !DatastoreVm.doNotCacheList.has(path)) {
      return this.compiledScriptsByPath.get(path);
    }

    const dir = Path.dirname(path);
    const srcDir = `${Path.dirname(dir)}${Path.sep}`;
    SourceMapSupport.clearStackPath(srcDir);
    SourceMapSupport.retrieveSourceMap(path, dir);

    const script = new Promise<Script>(async resolve => {
      const file = await Fs.readFile(path, 'utf8');

      const vmScript = new Script(file, {
        filename: path,
      });
      resolve(vmScript);
    });

    if (!DatastoreVm.doNotCacheList.has(path)) {
      this.compiledScriptsByPath.set(path, script);
    }
    return script;
  }

  private buildCustomRequire(appPath: string): (mod: string) => {} {
    // Cache for modules loaded in the custom require
    const moduleCache: { [key: string]: any } = {};
    const moduleCode = readFileSync(appPath, 'utf8');

    const boundRequire = require;
    const whitelist = this.whitelist;
    const defaultContext = this.getDefaultContext();

    return function requirer(mod: string) {
      if (!mod.includes('TypeSerializer')) {
        for (const builtin of whitelist) {
          if (mod.startsWith(builtin) || mod.match(builtin)) {
            return boundRequire(mod);
          }
        }
      }

      const moduleExports: any = {};
      const moduleContext: Context = {
        require: (name: string) => requirer(name),
        module: { exports: moduleExports },
        exports: moduleExports,
        ...defaultContext,
      };

      const script = new Script(moduleCode);
      script.runInNewContext(moduleContext);

      moduleCache[mod] = moduleExports;
      return moduleExports;
    };
  }
}
