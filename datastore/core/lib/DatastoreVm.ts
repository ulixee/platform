import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import { NodeVM, VMScript } from 'vm2';
import { promises as Fs } from 'fs';
import Datastore, { ConnectionToDatastoreCore, Crawler } from '@ulixee/datastore';
import Extractor from '@ulixee/datastore/lib/Extractor';
import { isSemverSatisfied } from '@ulixee/commons/lib/VersionUtils';
import TransportBridge from '@ulixee/net/lib/TransportBridge';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import { SourceMapSupport } from '@ulixee/commons/lib/SourceMapSupport';
import DatastoreStorage from '@ulixee/datastore/lib/DatastoreStorage';
import * as Path from 'path';
import DatastoreCore from '../index';

const { version } = require('../package.json');

export default class DatastoreVm {
  public static doNotCacheList = new Set<string>();
  private static compiledScriptsByPath = new Map<string, Promise<VMScript>>();
  private static _connectionToDatastoreCore: ConnectionToDatastoreCore;
  private static apiClientCacheByUrl: { [url: string]: DatastoreApiClient } = {};

  private static get connectionToDatastoreCore(): ConnectionToDatastoreCore {
    if (!this._connectionToDatastoreCore) {
      const bridge = new TransportBridge();
      this._connectionToDatastoreCore = new ConnectionToDatastoreCore(bridge.transportToCore);
      DatastoreCore.addConnection(bridge.transportToClient);
    }
    return this._connectionToDatastoreCore;
  }

  public static async open(
    path: string,
    storage: DatastoreStorage,
    manifest: IDatastoreManifest,
  ): Promise<Datastore> {
    if (!isSemverSatisfied(manifest.coreVersion, version)) {
      throw new Error(
        `The current version of Core (${version}) is incompatible with this Datastore version (${manifest.coreVersion})`,
      );
    }

    const script = await this.getVMScript(path);

    let datastore = this.getVm(path, manifest.versionHash).run(script) as Datastore;
    if (datastore instanceof Extractor) {
      const extractor = datastore;
      datastore = new Datastore({ extractors: { [extractor.name ?? 'default']: extractor } }) as Datastore;
    } else if (datastore instanceof Crawler) {
      const crawler = datastore;
      datastore = new Datastore({
        crawlers: { [crawler.name ?? 'default']: crawler },
      }) as Datastore;
    }
    if (!(datastore instanceof Datastore)) {
      throw new Error(
        'The default export from this script needs to inherit from "@ulixee/datastore"',
      );
    }
    datastore.bind({
      connectionToCore: this.connectionToDatastoreCore,
      datastoreStorage: storage,
      manifest,
      apiClientLoader: this.getCachedApiClient.bind(this),
    });

    return datastore;
  }

  public static async close(): Promise<void> {
    for (const client of Object.values(this.apiClientCacheByUrl)) {
      await client.disconnect();
    }
    this.apiClientCacheByUrl = {};
  }

  private static getCachedApiClient(host: string): DatastoreApiClient {
    if (!host.includes('://')) host = `ulx://${host}`;
    const url = new URL(host);
    host = `ulx://${url.host}`;
    this.apiClientCacheByUrl[host] ??= new DatastoreApiClient(host);
    return this.apiClientCacheByUrl[host];
  }

  private static getVMScript(path: string): Promise<VMScript> {
    if (this.compiledScriptsByPath.has(path)) {
      return this.compiledScriptsByPath.get(path);
    }

    SourceMapSupport.clearStackPath(`${Path.dirname(Path.dirname(Path.resolve(path)))}${Path.sep}`);

    const script = new Promise<VMScript>(async resolve => {
      const file = await Fs.readFile(path, 'utf8');
      const vmScript = new VMScript(file, {
        filename: path,
      }).compile();
      resolve(vmScript);
    });

    if (!this.doNotCacheList.has(path)) {
      console.log('caching compiled scripte', path);
      this.compiledScriptsByPath.set(path, script);
    }
    return script;
  }

  private static getVm(path: string, datastoreVersionHash: string): NodeVM {
    const whitelist: Set<string> = new Set(
      ...Object.values(DatastoreCore.pluginCoresByName).map(x => x.nodeVmRequireWhitelist || []),
    );
    whitelist.add('@ulixee/*');

    return new NodeVM({
      console: 'inherit',
      sandbox: {
        URL: Object.freeze(URL),
      },
      wasm: false,
      eval: false,
      wrapper: 'commonjs',
      strict: true,
      env: {
        ULX_INJECTED_CALLSITE: path,
        ULX_VIRTUAL_CONTAINER_ID: datastoreVersionHash,
        ULX_VIRTUAL_CONTAINER: 'datastore',
      },
      require: {
        external: {
          modules: Array.from(whitelist),
          transitive: false,
        },
        resolve: moduleName => {
          let isAllowed = false;
          for (const entry of whitelist) {
            if (moduleName.match(entry) || moduleName.includes('node_modules/@ulixee/')) {
              isAllowed = true;
              break;
            }
          }
          if (!isAllowed) return;
          // eslint-disable-next-line import/no-dynamic-require
          return require.resolve(moduleName);
        },
        builtin: [
          'buffer',
          'console',
          'errors',
          'events',
          'http',
          'https',
          'http2',
          'net',
          'path',
          'stream',
          'url',
          'util',
          'zlib',
        ],
      },
    });
  }
}
