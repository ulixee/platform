import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import { NodeVM, VMScript } from 'vm2';
import { promises as Fs } from 'fs';
import Datastore, { ConnectionToDatastoreCore, Crawler } from '@ulixee/datastore';
import Extractor from '@ulixee/datastore/lib/Extractor';
import { isSemverSatisfied } from '@ulixee/commons/lib/VersionUtils';
import TransportBridge from '@ulixee/net/lib/TransportBridge';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import { SourceMapSupport } from '@ulixee/commons/lib/SourceMapSupport';
import StorageEngine from '@ulixee/datastore/lib/StorageEngine';
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

  public static async getDatastore(path: string): Promise<Datastore> {
    const script = await this.getVMScript(path);
    let datastore = this.getVm().run(script) as Datastore;
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

  public static async open(
    path: string,
    storage: StorageEngine,
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

    await datastore.bind({
      connectionToCore: this.connectionToDatastoreCore,
      storageEngine: storage,
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
        compiler: 'javascript',
      }).compile();
      resolve(vmScript);
    });

    if (!this.doNotCacheList.has(path)) {
      this.compiledScriptsByPath.set(path, script);
    }
    return script;
  }

  private static getVm(): NodeVM {
    const plugins = [...Object.values(DatastoreCore.pluginCoresByName)];
    const whitelist: Set<string> = new Set([
      ...plugins.map(x => x.nodeVmRequireWhitelist || []).flat(),
      '@ulixee/datastore',
      '@ulixee/*-plugin',
      '@ulixee/net',
      '@ulixee/commons',
      '@ulixee/schema',
      '@ulixee/specification',
      '@ulixee/platform-specification',
    ]);

    return new NodeVM({
      console: 'inherit',
      sandbox: {
        URL: Object.freeze(URL),
      },
      wasm: false,
      eval: false,
      wrapper: 'commonjs',
      strict: true,
      require: {
        context: 'host',
        external: {
          modules: Array.from(whitelist),
          transitive: false,
        },
        // This is needed because the underlying node vm/Script can't see the origin line numbers
        // from the "host", so we need Hero to be loaded into the Sandbox
        pathContext(name) {
          for (const plugin of plugins) {
            if (plugin.nodeVmUseSandbox?.(name) === true) {
              return 'sandbox';
            }
          }
          return 'host';
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
    } as any);
  }
}
