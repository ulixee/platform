import IDatastoreManifest from '@ulixee/specification/types/IDatastoreManifest';
import { NodeVM, VMScript } from 'vm2';
import { promises as Fs } from 'fs';
import Datastore, { ConnectionToDatastoreCore } from '@ulixee/datastore';
import Function from '@ulixee/datastore/lib/Function';
import { isSemverSatisfied } from '@ulixee/commons/lib/VersionUtils';
import TransportBridge from '@ulixee/net/lib/TransportBridge';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import DatastoreCore from '../index';

const { version } = require('../package.json');

export default class DatastoreVm {
  private static vm: NodeVM;
  private static compiledScriptsByPath = new Map<string, Promise<VMScript>>();
  private static _connectionToDatastoreCore: ConnectionToDatastoreCore;
  private static apiClientCacheByUrl: { [url: string]: DatastoreApiClient } = {};

  private static get connectionToDatastoreCore(): ConnectionToDatastoreCore {
    if (!this._connectionToDatastoreCore) {
      const bridge = new TransportBridge();
      this._connectionToDatastoreCore = new ConnectionToDatastoreCore(bridge.transportToCore);
      DatastoreCore.addConnection(bridge.transportToClient).isInternal = true;
    }
    return this._connectionToDatastoreCore;
  }

  public static async open(path: string, manifest: IDatastoreManifest): Promise<Datastore> {
    if (!isSemverSatisfied(manifest.coreVersion, version)) {
      throw new Error(
        `The current version of Core (${version}) is incompatible with this Datastore version (${manifest.coreVersion})`,
      );
    }

    const script = await this.getVMScript(path, manifest);

    let datastore = this.getVm().run(script) as Datastore;
    if (datastore instanceof Function) {
      const func = datastore as Function;
      datastore = new Datastore({ functions: { [func.name ?? 'default']: func } }) as Datastore;
    }
    if (!(datastore instanceof Datastore)) {
      throw new Error(
        'The default export from this script needs to inherit from "@ulixee/datastore"',
      );
    }
    datastore.addConnectionToDatastoreCore(
      this.connectionToDatastoreCore,
      manifest,
      this.getCachedApiClient.bind(this),
    );

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

  private static getVMScript(path: string, manifest: IDatastoreManifest): Promise<VMScript> {
    if (this.compiledScriptsByPath.has(path)) {
      return this.compiledScriptsByPath.get(path);
    }

    const script = new Promise<VMScript>(async resolve => {
      const file = await Fs.readFile(path, 'utf8');
      const vmScript = new VMScript(file, {
        filename: manifest.scriptEntrypoint,
      }).compile();
      resolve(vmScript);
    });

    this.compiledScriptsByPath.set(path, script);
    return script;
  }

  private static getVm(): NodeVM {
    if (!this.vm) {
      const whitelist: Set<string> = new Set(
        ...Object.values(DatastoreCore.pluginCoresByName).map(x => x.nodeVmRequireWhitelist || []),
      );
      whitelist.add('@ulixee/*');

      this.vm = new NodeVM({
        console: 'inherit',
        sandbox: {},
        wasm: false,
        eval: false,
        wrapper: 'commonjs',
        strict: true,
        require: {
          external: Array.from(whitelist),
        },
      });
    }

    return this.vm;
  }
}
