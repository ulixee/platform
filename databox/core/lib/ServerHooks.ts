import { IDataboxApis } from '@ulixee/databox-interfaces/IDataboxApis';
import IDataboxPackage from '@ulixee/databox-interfaces/IDataboxPackage';
import PackageRegistry from './PackageRegistry';
import IDataboxModuleRunner from '../interfaces/IDataboxModuleRunner';
import ConnectionToClient from '@ulixee/net/lib/ConnectionToClient';
import ITransportToClient from '@ulixee/net/interfaces/ITransportToClient';
import IDataboxManifest from '@ulixee/databox-interfaces/IDataboxManifest';
import env from '../env';
import LocalDataboxProcess from './LocalDataboxProcess';

type IDataboxConnectionToClient = ConnectionToClient<IDataboxApis, {}>;

export default class ServerHooks {
  public static connections = new Set<IDataboxConnectionToClient>();
  public static databoxesDir: string;

  private static runnersByModuleName: { [module: string]: IDataboxModuleRunner } = {};
  private static packageRegistry: PackageRegistry;
  private static apiHandlers: IDataboxApis = {
    'Databox.upload': ServerHooks.upload.bind(this),
    'Databox.run': ServerHooks.run.bind(this),
    'Databox.runLocalScript': ServerHooks.runLocalScript.bind(this),
  };

  public static addConnection(
    transport: ITransportToClient<IDataboxApis, {}>,
  ): IDataboxConnectionToClient {
    const connection = new ConnectionToClient(transport, this.apiHandlers);
    connection.once('disconnected', () => this.connections.delete(connection));
    this.connections.add(connection);
    return connection;
  }

  public static registerModule(moduleRunner: IDataboxModuleRunner): void {
    this.runnersByModuleName[moduleRunner.runsDataboxModule] = moduleRunner;
  }

  public static async start(): Promise<void> {
    this.databoxesDir = env.databoxStorage;
    for (const runner of Object.values(this.runnersByModuleName)) {
      await runner.start(this.databoxesDir);
    }
  }

  public static async close(): Promise<void> {
    this.packageRegistry?.flush();
    for (const runner of Object.values(this.runnersByModuleName)) {
      await runner.close();
    }
    this.runnersByModuleName = {};

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
    const runner = this.runnersByModuleName[databox.module];
    if (!runner) {
      throw new Error(`Server does not support required databox module: ${databox.module}`);
    }
    if (!runner.canSatisfyVersion(databox.moduleVersion)) {
      throw new Error(
        `The current version of ${databox.module} (${runner.runsDataboxModuleVersion}) is incompatible with this Databox version (${databox.moduleVersion})`,
      );
    }

    const manifest = <IDataboxManifest>{
      scriptEntrypoint: databox.scriptEntrypoint,
      scriptRollupHash: databox.scriptHash,
      databoxModuleVersion: databox.moduleVersion,
      databoxModule: databox.module,
    };

    return await runner.run(databox.path, manifest, input);
  }

  public static async run(scriptHash: string, input?: any): Promise<{ output: any }> {
    const databox = await this.getPackageRegistry().getByHash(scriptHash);
    const runner = this.runnersByModuleName[databox.module];
    if (!runner) {
      throw new Error(`Server does not support required databox module: ${databox.module}`);
    }
    if (!runner.canSatisfyVersion(databox.moduleVersion)) {
      throw new Error(
        `The current version of ${databox.module} (${runner.runsDataboxModuleVersion}) is incompatible with this Databox version (${databox.moduleVersion})`,
      );
    }

    const manifest = <IDataboxManifest>{
      scriptEntrypoint: databox.scriptEntrypoint,
      scriptRollupHash: databox.scriptHash,
      databoxModuleVersion: databox.moduleVersion,
      databoxModule: databox.module,
    };

    return await runner.run(databox.path, manifest, input);
  }

  public static async runLocalScript(scriptPath: string, input?: any): Promise<{ output: any }> {
    const databoxProcess = new LocalDataboxProcess(scriptPath);
    const databoxModule = await databoxProcess.fetchModule();
    const runner = this.runnersByModuleName[databoxModule];
    if (!runner) {
      throw new Error(`Server does not support required databox module: ${databoxModule}`);
    }
    // TODO: should we extract version from file?
    // if (!runner.canSatisfyVersion(databox.moduleVersion)) {
    //   throw new Error(
    //     `The current version of ${databoxModule} (${runner.runsDataboxModuleVersion}) is incompatible with this Databox version (${databox.moduleVersion})`,
    //   );
    // }

    console.log('RUNNING ', scriptPath, input);
    const output = await databoxProcess.run(input);
    
    console.log(output);

    return { output };
  }

  private static getPackageRegistry(): PackageRegistry {
    this.packageRegistry ??= new PackageRegistry(this.databoxesDir);
    return this.packageRegistry;
  }
}
