import { IDataboxApis } from '@ulixee/databox-interfaces/IDataboxApis';
import IDataboxPackage from '@ulixee/databox-interfaces/IDataboxPackage';
import IDataboxCoreRuntime from '@ulixee/databox-interfaces/IDataboxCoreRuntime';
import ConnectionToClient from '@ulixee/net/lib/ConnectionToClient';
import ITransportToClient from '@ulixee/net/interfaces/ITransportToClient';
import IDataboxManifest from '@ulixee/databox-interfaces/IDataboxManifest';
import LocalDataboxProcess from './lib/LocalDataboxProcess';
import PackageRegistry from './lib/PackageRegistry';
import env from './env';

type IDataboxConnectionToClient = ConnectionToClient<IDataboxApis, {}>;

export default class DataboxCore {
  public static connections = new Set<IDataboxConnectionToClient>();
  public static databoxesDir: string;

  private static coreRuntimesByName: { [name: string]: IDataboxCoreRuntime } = {};
  private static packageRegistry: PackageRegistry;
  private static apiHandlers: IDataboxApis = {
    'Databox.upload': DataboxCore.upload.bind(this),
    'Databox.run': DataboxCore.run.bind(this),
    'Databox.runLocalScript': DataboxCore.runLocalScript.bind(this),
  };

  public static addConnection(
    transport: ITransportToClient<IDataboxApis, {}>,
  ): IDataboxConnectionToClient {
    const connection = new ConnectionToClient(transport, this.apiHandlers);
    connection.once('disconnected', () => this.connections.delete(connection));
    this.connections.add(connection);
    return connection;
  }

  public static registerRuntime(coreRuntime: IDataboxCoreRuntime): void {
    this.coreRuntimesByName[coreRuntime.databoxRuntimeName] = coreRuntime;
  }

  public static async start(): Promise<void> {
    this.databoxesDir ??= env.databoxStorage;
    for (const runner of Object.values(this.coreRuntimesByName)) {
      await runner.start(this.databoxesDir);
    }
  }

  public static async close(): Promise<void> {
    this.packageRegistry?.flush();
    for (const runner of Object.values(this.coreRuntimesByName)) {
      await runner.close();
    }
    this.coreRuntimesByName = {};

    for (const connection of this.connections) {
      await connection.disconnect();
    }
    this.connections.clear();
  }

  public static async upload(databoxPackage: IDataboxPackage): Promise<void> {
    await this.getPackageRegistry().save(databoxPackage);
  }

  public static async runLocalFile(scriptHash: string, input?: any): Promise<{ output: any }> {
    const databox = await this.getPackageRegistry().getByHash(scriptHash);
    const runner = this.coreRuntimesByName[databox.runtimeName];
    if (!runner) {
      throw new Error(`Server does not support required databox runtime: ${databox.runtimeName}`);
    }
    if (!runner.canSatisfyVersion(databox.runtimeVersion)) {
      throw new Error(
        `The current version of ${databox.runtimeName} (${runner.databoxRuntimeVersion}) is incompatible with this Databox version (${databox.runtimeVersion})`,
      );
    }

    const manifest = <IDataboxManifest>{
      scriptEntrypoint: databox.scriptEntrypoint,
      scriptRollupHash: databox.scriptHash,
      runtimeVersion: databox.runtimeVersion,
      runtimeName: databox.runtimeName,
    };

    return await runner.run(databox.path, manifest, input);
  }

  public static async run(scriptHash: string, input?: any): Promise<{ output: any }> {
    const databox = await this.getPackageRegistry().getByHash(scriptHash);
    const runner = this.coreRuntimesByName[databox.runtimeName];
    if (!runner) {
      throw new Error(`Server does not support required databox runtime: ${databox.runtimeName}`);
    }
    if (!runner.canSatisfyVersion(databox.runtimeVersion)) {
      throw new Error(
        `The current version of ${databox.runtimeName} (${runner.databoxRuntimeVersion}) is incompatible with this Databox version (${databox.runtimeVersion})`,
      );
    }

    const manifest = <IDataboxManifest>{
      scriptEntrypoint: databox.scriptEntrypoint,
      scriptRollupHash: databox.scriptHash,
      runtimeVersion: databox.runtimeVersion,
      runtimeName: databox.runtimeName,
    };

    return await runner.run(databox.path, manifest, input);
  }

  public static async runLocalScript(scriptPath: string, input?: any): Promise<{ output: any }> {
    const databoxProcess = new LocalDataboxProcess(scriptPath);
    const runtime = await databoxProcess.fetchRuntime();
    const runner = this.coreRuntimesByName[runtime.name];
    if (!runner) {
      throw new Error(`Server does not support required databox runtime: ${runtime.name}`);
    }

    const output = await databoxProcess.run(input);
    
    return { output };
  }

  private static getPackageRegistry(): PackageRegistry {
    this.packageRegistry ??= new PackageRegistry(this.databoxesDir);
    return this.packageRegistry;
  }
}
