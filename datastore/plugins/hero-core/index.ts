import IDatastoreCoreConfigureOptions from '@ulixee/datastore-core/interfaces/IDatastoreCoreConfigureOptions';
import { IHeroExtractorRunOptions } from '@ulixee/datastore-plugins-hero';
import type IExtractorPluginCore from '@ulixee/datastore/interfaces/IExtractorPluginCore';
import { ConnectionToHeroCore } from '@ulixee/hero';
import HeroCore from '@ulixee/hero-core';
import CallsiteLocator from '@ulixee/hero/lib/CallsiteLocator';
import TransportBridge from '@ulixee/net/lib/TransportBridge';
import { nanoid } from 'nanoid';

const pkg = require('@ulixee/datastore-plugins-hero/package.json');

export default class DatastoreForHeroPluginCore implements IExtractorPluginCore {
  public name = pkg.name;
  public version = pkg.version;
  public nodeVmRequireWhitelist = [
    '@ulixee/hero',
    '@ulixee/unblocked-agent',
    '@ulixee/unblocked-specification',
    '@ulixee/awaited-dom',
    '@ulixee/execute-js-plugin',
    '@ulixee/datastore-plugins-hero',
  ];

  private connectionToCore: ConnectionToHeroCore;
  private sessionDbDirectory: string;

  private nodeVmSandboxList = [
    '@ulixee/hero',
    '@ulixee/awaited-dom',
    '@ulixee/execute-js-plugin/index',
    '@ulixee/execute-js-plugin/lib/ClientPlugin',
    '@ulixee/datastore-plugins-hero',
    'TypedEventEmitter',
    'eventUtils',
  ];

  private nodeVmSandboxExceptionsList = [
    // Requires linkedom, so require in host
    '@ulixee/hero/lib/DetachedElement.js',
    // Need a single instance so we can inject vm2 into ignore list
    '@ulixee/hero/lib/CallsiteLocator',
    // requires readline, which we don't want to expose in sandbox
    '@ulixee/hero/lib/CoreKeepAlivePrompt',
    // requires @ulixee/net @ulixee/cloud
    '@ulixee/hero/connections',
  ];

  public nodeVmUseSandbox(name: string): boolean {
    // exclude exceptions first

    for (const noSandboxModuleName of this.nodeVmSandboxExceptionsList) {
      if (name.includes(noSandboxModuleName)) return false;
    }

    for (const sandboxed of this.nodeVmSandboxList) {
      if (name.includes(sandboxed)) return true;
    }
  }

  public async onCoreStart(options: IDatastoreCoreConfigureOptions): Promise<void> {
    await HeroCore.start();
    this.sessionDbDirectory = options.queryHeroSessionsDir;
    const vm2 = require.resolve('vm2').replace('index.js', '');
    if (!CallsiteLocator.ignoreModulePaths.includes(vm2)) {
      CallsiteLocator.ignoreModulePaths.push(vm2);
    }

    if (process.platform === 'win32') {
      this.nodeVmSandboxList = this.nodeVmSandboxList.map(x => x.replace(/\//g, '\\'));
      this.nodeVmSandboxExceptionsList = this.nodeVmSandboxExceptionsList.map(x =>
        x.replace(/\//g, '\\'),
      );
    }
    const bridge = new TransportBridge();
    HeroCore.addConnection(bridge.transportToClient);
    this.connectionToCore = new ConnectionToHeroCore(bridge.transportToCore);
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
    options.sessionId = `query-${options.id}-${nanoid(3)}`;
    options.sessionDbDirectory = this.sessionDbDirectory;

    options.connectionToCore = this.connectionToCore;
  }

  public async onCoreClose(): Promise<void> {
    await this.connectionToCore?.disconnect();
    await HeroCore.shutdown();
  }
}
