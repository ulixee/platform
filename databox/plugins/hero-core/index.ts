import HeroCore from '@ulixee/hero-core';
import DataboxCore from '@ulixee/databox-core';
import { ConnectionToHeroCore } from '@ulixee/hero';
import TransportBridge from '@ulixee/net/lib/TransportBridge';
import { IHeroFunctionExecOptions } from '@ulixee/databox-plugins-hero';
import IFunctionPluginCore from '@ulixee/databox/interfaces/IFunctionPluginCore';

const pkg = require('@ulixee/databox-plugins-hero/package.json');

export default class DataboxForHeroPluginCore implements IFunctionPluginCore {
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
    DataboxCore.registerPlugin(new DataboxForHeroPluginCore());
  }
}
