import IDatastoreCoreConfigureOptions from '@ulixee/datastore-core/interfaces/IDatastoreCoreConfigureOptions';
import { IHeroExtractorRunOptions } from '@ulixee/datastore-plugins-hero';
import type IExtractorPluginCore from '@ulixee/datastore/interfaces/IExtractorPluginCore';
import { ConnectionToHeroCore } from '@ulixee/hero';
import HeroCore from '@ulixee/hero-core';
import { ConnectionToClient, ConnectionToCore } from '@ulixee/net';
import TransportBridge from '@ulixee/net/lib/TransportBridge';
import { nanoid } from 'nanoid';
import * as Path from 'path';
import ReplayRegistryEndpoints from './endpoints/ReplayRegistryEndpoints';
import ReplayRegistry from './lib/ReplayRegistry';

const pkg = require('@ulixee/datastore-plugins-hero/package.json');

export default class DatastoreForHeroPluginCore implements IExtractorPluginCore {
  public name = pkg.name;
  public version = pkg.version;
  public replayRegistry: ReplayRegistry;

  public nodeVmRequireWhitelist = [
    '@ulixee/hero',
    '@ulixee/unblocked-agent',
    '@ulixee/unblocked-specification',
    '@ulixee/awaited-dom',
    '@ulixee/execute-js-plugin',
    '@ulixee/datastore-plugins-hero',
  ];

  private connectionToCore: ConnectionToHeroCore;

  private nodeVmSandboxList = [
    '@ulixee/hero',
    '@ulixee/awaited-dom',
    '@ulixee/execute-js-plugin/index',
    '@ulixee/execute-js-plugin/lib/ClientPlugin',
    '@ulixee/datastore-plugins-hero',
    'TypedEventEmitter',
    'eventUtils',
  ];

  private endpoints: ReplayRegistryEndpoints;

  // eslint-disable-next-line @typescript-eslint/require-await
  public async onCoreStart(
    coreConfigureOptions: IDatastoreCoreConfigureOptions,
    options: {
      createConnectionToServiceHost: (host: string) => ConnectionToCore<any, any>;
      getSystemCore: (name: 'heroCore' | 'datastoreCore' | 'desktopCore') => any;
    },
  ): Promise<void> {
    const heroCore = options.getSystemCore('heroCore') as HeroCore;
    if (!heroCore) {
      throw new Error('Could not find a heroCore instance to attach to!!');
    }

    this.replayRegistry = new ReplayRegistry({
      queryHeroStorageDir: coreConfigureOptions.queryHeroSessionsDir,
      defaultHeroStorageDir: Path.join(heroCore.dataDir, 'hero-sessions'),
      serviceClient: options.createConnectionToServiceHost(coreConfigureOptions.replayRegistryHost),
    });
    heroCore.sessionRegistry = this.replayRegistry;
    this.endpoints = new ReplayRegistryEndpoints();

    if (process.platform === 'win32') {
      this.nodeVmSandboxList = this.nodeVmSandboxList.map(x => x.replace(/\//g, '\\'));
    }
    const bridge = new TransportBridge();
    heroCore.addConnection(bridge.transportToClient);
    this.connectionToCore = new ConnectionToHeroCore(bridge.transportToCore);
  }

  public beforeRunExtractor(
    options: IHeroExtractorRunOptions<unknown>,
    runtime: { scriptEntrypoint: string; functionName: string },
  ): void {
    options.scriptInvocationMeta = {
      version: options.version,
      productId: options.id,
      runId: options.queryId,
      entrypoint: runtime.scriptEntrypoint,
      entryFunction: runtime.functionName,
      runtime: 'datastore',
    };
    options.sessionId = `query-${options.queryId}-${nanoid(3)}`;
    options.connectionToCore = this.connectionToCore;
  }

  public registerHostedServices(connectionToClient: ConnectionToClient<any, any>): void {
    this.endpoints?.attachToConnection(connectionToClient, { replayRegistry: this.replayRegistry });
  }

  public async onCoreClose(): Promise<void> {
    await this.replayRegistry?.shutdown();
    await this.connectionToCore?.disconnect();
  }
}
