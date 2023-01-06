import HeroCore from '@ulixee/hero-core';
import DatastoreCore from '@ulixee/datastore-core';
import { ConnectionToHeroCore } from '@ulixee/hero';
import TransportBridge from '@ulixee/net/lib/TransportBridge';
import { IHeroFunctionExecOptions } from '@ulixee/datastore-plugins-hero';
import IFunctionPluginCore from '@ulixee/datastore/interfaces/IFunctionPluginCore';

const pkg = require('@ulixee/datastore-plugins-hero/package.json');

export default class DatastoreForHeroPluginCore implements IFunctionPluginCore {
  public name = pkg.name;
  public version = pkg.version;
  public nodeVmRequireWhitelist = ['@ulixee/*'];

  private connectionToHeroCore: ConnectionToHeroCore;

  public async onCoreStart(): Promise<void> {
    await HeroCore.start();
    const bridge = new TransportBridge();
    HeroCore.addConnection(bridge.transportToClient);
    this.connectionToHeroCore = new ConnectionToHeroCore(bridge.transportToCore);
  }

  public beforeExecFunction(options: IHeroFunctionExecOptions<unknown>): void {
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
