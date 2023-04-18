import HeroCore from '@ulixee/hero-core';
import DatastoreCore from '@ulixee/datastore-core';
import { ConnectionToHeroCore } from '@ulixee/hero';
import TransportBridge from '@ulixee/net/lib/TransportBridge';
import { IHeroExtractorRunOptions } from '@ulixee/datastore-plugins-hero';
import IExtractorPluginCore from '@ulixee/datastore/interfaces/IExtractorPluginCore';
import CallsiteLocator from '@ulixee/hero/lib/CallsiteLocator';

const pkg = require('@ulixee/datastore-plugins-hero/package.json');

export default class DatastoreForHeroPluginCore implements IExtractorPluginCore {
  public name = pkg.name;
  public version = pkg.version;
  public nodeVmRequireWhitelist = [
    '@ulixee/hero',
    '@ulixee/unblocked-agent',
    '@ulixee/awaited-dom',
    '@ulixee/execute-js-plugin',
    '@ulixee/datastore-plugins-hero',
  ];

  private transportBridge: TransportBridge<any>;

  public nodeVmUseSandbox(name: string): boolean {
    if (
      // Requires linkedom, so use in base
      name.includes('@ulixee/hero/lib/DetachedElement.js') ||
      // Need a single instance so we can inject vm2
      name.includes('@ulixee/hero/lib/CallsiteLocator') ||
      // requires readline, which we don't want to expose in sandbox
      name.includes('@ulixee/hero/lib/CoreKeepAlivePrompt') ||
      // requires @ulixee/net @ulixee/cloud
      name.includes('@ulixee/hero/connections')
    )
      return false;

    return (
      name.includes('@ulixee/hero') ||
      name.includes('@ulixee/awaited-dom') ||
      name.includes('@ulixee/execute-js-plugin/index') ||
      name.includes('@ulixee/execute-js-plugin/lib/ClientPlugin') ||
      name.includes('@ulixee/datastore-plugins-hero') ||
      name.includes('TypedEventEmitter') ||
      name.includes('eventUtils')
    );
  }

  public async onCoreStart(): Promise<void> {
    await HeroCore.start();
    const vm2 = require.resolve('vm2').replace('index.js', '');
    if (!CallsiteLocator.ignoreModulePaths.includes(vm2)) {
      CallsiteLocator.ignoreModulePaths.push(vm2);
    }

    const bridge = new TransportBridge();
    HeroCore.addConnection(bridge.transportToClient);
    this.transportBridge = bridge;
  }

  public beforeRunExtractor(
    options: IHeroExtractorRunOptions<unknown>,
    runtime: { scriptEntrypoint: string; functionName: string },
  ): void {
    options.scriptInvocationMeta = {
      version: options.versionHash,
      runId: options.id,
      entrypoint: runtime.scriptEntrypoint,
      entryFunction: runtime.functionName,
      runtime: 'datastore',
    };

    options.callsiteLocator = new CallsiteLocator(runtime.scriptEntrypoint);
    options.connectionToCore = new ConnectionToHeroCore(
      this.transportBridge.transportToCore,
      null,
      options.callsiteLocator,
    );
  }

  public async onCoreClose(): Promise<void> {
    await HeroCore.shutdown();
  }

  public static register(): void {
    DatastoreCore.registerPlugin(new DatastoreForHeroPluginCore());
  }
}
