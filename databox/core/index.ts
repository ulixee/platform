import { IDataboxApis } from '@ulixee/databox-interfaces/IDataboxApis';
import IDataboxPackage from '@ulixee/databox-interfaces/IDataboxPackage';
import ConnectionToClient from '@ulixee/net/lib/ConnectionToClient';
import ITransportToClient from '@ulixee/net/interfaces/ITransportToClient';
import IDataboxManifest from '@ulixee/databox-interfaces/IDataboxManifest';
import IDataboxModuleRunner from './interfaces/IDataboxModuleRunner';
import PackageRegistry from './lib/PackageRegistry';
import env from './env';

type IDataboxConnectionToClient = ConnectionToClient<IDataboxApis, {}>;

export default class DataboxCore {
  public static connections = new Set<IDataboxConnectionToClient>();
  public static databoxesDir: string;

  private static runnersByModuleName: { [module: string]: IDataboxModuleRunner } = {};
  private static packageRegistry: PackageRegistry;
  private static apiHandlers: IDataboxApis = {
    'Databox.upload': DataboxCore.upload.bind(this),
    'Databox.run': DataboxCore.run.bind(this),
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

  public static async run(scriptHash: string, input?: any): Promise<{ output: any }> {
    const databox = await this.getPackageRegistry().getByHash(scriptHash);

    const runner = this.runnersByModuleName[databox.module];
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

  private static getPackageRegistry(): PackageRegistry {
    this.packageRegistry ??= new PackageRegistry(this.databoxesDir);
    return this.packageRegistry;
  }
}
