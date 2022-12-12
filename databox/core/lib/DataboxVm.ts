import IDataboxManifest from '@ulixee/specification/types/IDataboxManifest';
import { NodeVM, VMScript } from 'vm2';
import { promises as Fs } from 'fs';
import Databox, { ConnectionToDataboxCore, Function } from '@ulixee/databox';
import { isSemverSatisfied } from '@ulixee/commons/lib/VersionUtils';
import TransportBridge from '@ulixee/net/lib/TransportBridge';
import DataboxCore from '../index';

const { version } = require('../package.json');

export default class DataboxVm {
  private static vm: NodeVM;
  private static compiledScriptsByPath = new Map<string, Promise<VMScript>>();
  private static _connectionToDataboxCore: ConnectionToDataboxCore;

  private static get connectionToDataboxCore(): ConnectionToDataboxCore {
    if (this._connectionToDataboxCore) {
      const bridge = new TransportBridge();
      this._connectionToDataboxCore = new ConnectionToDataboxCore(bridge.transportToCore);
      DataboxCore.addConnection(bridge.transportToClient).isInternal = true;
    }
    return this._connectionToDataboxCore;
  }

  public static async open(path: string, manifest: IDataboxManifest): Promise<Databox<any, any>> {
    if (!isSemverSatisfied(manifest.coreVersion, version)) {
      throw new Error(
        `The current version of Core (${version}) is incompatible with this Databox version (${manifest.coreVersion})`,
      );
    }

    const script = await this.getVMScript(path, manifest);

    let databox = this.getVm().run(script) as Databox<any, any>;
    if (databox instanceof Function) {
      databox = databox.databox;
    }
    if (!(databox instanceof Databox)) {
      throw new Error(
        'The default export from this script needs to inherit from "@ulixee/databox"',
      );
    }
    databox.addConnectionToDataboxCore(this.connectionToDataboxCore, manifest);

    return databox;
  }

  private static getVMScript(path: string, manifest: IDataboxManifest): Promise<VMScript> {
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
        ...Object.values(DataboxCore.pluginCoresByName).map(x => x.nodeVmRequireWhitelist || []),
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
