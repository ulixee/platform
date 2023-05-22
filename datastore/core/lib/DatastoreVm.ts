import { SourceMapSupport } from '@ulixee/commons/lib/SourceMapSupport';
import { isSemverSatisfied } from '@ulixee/commons/lib/VersionUtils';
import Datastore, { ConnectionToDatastoreCore, Crawler } from '@ulixee/datastore';
import type IExtractorPluginCore from '@ulixee/datastore/interfaces/IExtractorPluginCore';
import IStorageEngine from '@ulixee/datastore/interfaces/IStorageEngine';
import Extractor from '@ulixee/datastore/lib/Extractor';
import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import { promises as Fs } from 'fs';
import * as Path from 'path';
import { NodeVM, VMScript } from 'vm2';
import DatastoreApiClients from './DatastoreApiClients';

const { version } = require('../package.json');

const bundledPath = Path.join('build', 'desktop', 'main', 'app', 'packages');

export default class DatastoreVm {
  public static doNotCacheList = new Set<string>();
  private compiledScriptsByPath = new Map<string, Promise<VMScript>>();
  private readonly connectionToDatastoreCore: ConnectionToDatastoreCore;
  private readonly apiClientCache: DatastoreApiClients;

  constructor(
    connectionToDatastoreCore: ConnectionToDatastoreCore,
    apiClientCache: DatastoreApiClients,
    readonly plugins: IExtractorPluginCore[],
  ) {
    this.apiClientCache = apiClientCache;
    this.connectionToDatastoreCore = connectionToDatastoreCore;
  }

  public async getDatastore(path: string): Promise<Datastore> {
    const script = await this.getVMScript(path);
    const vm = this.getVm();
    let datastore = vm.run(script) as Datastore;
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

    await datastore.bind({
      connectionToCore: this.connectionToDatastoreCore,
      storageEngine: storage,
      manifest,
      apiClientLoader: this.apiClientCache.get.bind(this.apiClientCache),
    });

    return datastore;
  }

  private getVMScript(path: string): Promise<VMScript> {
    path = Path.resolve(path);
    if (this.compiledScriptsByPath.has(path) && !DatastoreVm.doNotCacheList.has(path)) {
      return this.compiledScriptsByPath.get(path);
    }

    const srcDir = `${Path.dirname(Path.dirname(path))}${Path.sep}`;
    SourceMapSupport.clearStackPath(srcDir);
    SourceMapSupport.retrieveSourceMap(path, Path.dirname(path));

    const script = new Promise<VMScript>(async resolve => {
      const file = await Fs.readFile(path, 'utf8');

      const vmScript = new VMScript(file, {
        filename: path,
        compiler: 'javascript',
      }).compile();
      resolve(vmScript);
    });

    if (!DatastoreVm.doNotCacheList.has(path)) {
      this.compiledScriptsByPath.set(path, script);
    }
    return script;
  }

  private getVm(): NodeVM {
    const plugins = this.plugins;
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
        vmStack: {},
      },
      wasm: false,
      eval: false,
      wrapper: 'commonjs',
      strict: true,
      require: {
        external: {
          modules: Array.from(whitelist),
          transitive: true,
        },
        // This is needed because the underlying node vm/Script can't see the origin line numbers
        // from the "host", so we need Hero to be loaded into the Sandbox
        context(name: string) {
          for (const plugin of plugins) {
            if (
              plugin.nodeVmUseSandbox?.(name) === true ||
              plugin.nodeVmUseSandbox?.(
                name
                  .replace(bundledPath, '@ulixee'),
              ) === true
            ) {
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
