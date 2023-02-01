import HeroCore from '@ulixee/hero-core';
import DatastoreCore from '@ulixee/datastore-core';
import { ConnectionToHeroCore } from '@ulixee/hero';
import TransportBridge from '@ulixee/net/lib/TransportBridge';
import { IHeroRunnerExecOptions } from '@ulixee/datastore-plugins-hero';
import IRunnerPluginCore from '@ulixee/datastore/interfaces/IRunnerPluginCore';
import ScriptInstance from '@ulixee/hero/lib/ScriptInstance';

const pkg = require('@ulixee/datastore-plugins-hero/package.json');

export default class DatastoreForHeroPluginCore implements IRunnerPluginCore {
  public name = pkg.name;
  public version = pkg.version;
  public nodeVmRequireWhitelist = ['@ulixee/*'];

  private connectionToHeroCore: ConnectionToHeroCore;

  public async onCoreStart(): Promise<void> {
    await HeroCore.start();
    ScriptInstance.ignoreModulePaths.push(require.resolve('vm2'));

    const bridge = new TransportBridge();
    HeroCore.addConnection(bridge.transportToClient);
    this.connectionToHeroCore = new ConnectionToHeroCore(bridge.transportToCore);
  }

  public beforeExecRunner(options: IHeroRunnerExecOptions<unknown>): void {
    options.connectionToCore = this.connectionToHeroCore;
  }

  public async onCoreClose(): Promise<void> {
    await this.connectionToHeroCore?.disconnect();
    await HeroCore.shutdown();
  }

  public static register(): void {
    DatastoreCore.registerPlugin(new DatastoreForHeroPluginCore());
  }
}
