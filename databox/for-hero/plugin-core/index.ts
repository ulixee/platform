import HeroCore from '@ulixee/hero-core';
import DataboxCore from '@ulixee/databox-core';
import { ConnectionToHeroCore } from '@ulixee/hero';
import TransportBridge from '@ulixee/net/lib/TransportBridge';
import IDataboxForHeroExecOptions from '@ulixee/databox-for-hero/interfaces/IDataboxForHeroExecOptions';
import IDataboxPluginCore from '@ulixee/databox-interfaces/IDataboxPluginCore';

const pkg = require('@ulixee/databox-for-hero/package.json');

export default class DataboxForHeroPluginCore implements IDataboxPluginCore {
  public name = pkg.name;
  public version = pkg.version;
  public nodeVmRequireWhitelist = ['@ulixee/*', 'awaited-dom'];

  private connectionToHeroCore: ConnectionToHeroCore;

  public async onCoreStart(): Promise<void> {
    await HeroCore.start();
    const bridge = new TransportBridge();
    HeroCore.addConnection(bridge.transportToClient);
    this.connectionToHeroCore = new ConnectionToHeroCore(bridge.transportToCore);
  }

  public onBeforeExecDatabox(options: IDataboxForHeroExecOptions<unknown>): void {
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
