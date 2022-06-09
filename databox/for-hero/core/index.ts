import HeroCore from '@ulixee/hero-core';
import { isSemverSatisfied } from '@ulixee/commons/lib/VersionUtils';
import IDataboxModuleRunner from '@ulixee/databox-core/interfaces/IDataboxModuleRunner';
import DataboxCore from '@ulixee/databox-core';
import { ConnectionToHeroCore } from '@ulixee/hero';
import IDataboxManifest from '@ulixee/databox-interfaces/IDataboxManifest';
import { NodeVM, VMScript } from 'vm2';
import DataboxWrapper from '@ulixee/databox-for-hero';
import * as Fs from 'fs';
import TransportBridge from '@ulixee/net/lib/TransportBridge';

const { version: HeroVersion } = require('@ulixee/hero-core/package.json');

export default class DataboxForHeroCore implements IDataboxModuleRunner {
  public runsDataboxModuleVersion: string = HeroVersion;
  public runsDataboxModule = '@ulixee/databox-for-hero';

  private compiledScriptsByPath = new Map<string, Promise<VMScript>>();

  private connectionToHeroCore: ConnectionToHeroCore;
  private vm = new NodeVM({
    console: 'inherit',
    sandbox: {},
    wasm: false,
    eval: false,
    wrapper: 'commonjs',
    strict: true,
    require: {
      external: ['@ulixee/*', '@unblocked-web/*', 'awaited-dom'],
    },
  });

  public async start(): Promise<void> {
    DataboxWrapper.disableAutorun = true;
    await HeroCore.start();
    const bridge = new TransportBridge();
    HeroCore.addConnection(bridge.transportToClient);
    this.connectionToHeroCore = new ConnectionToHeroCore(bridge.transportToCore);
  }

  public async close(): Promise<void> {
    await this.connectionToHeroCore?.disconnect();
    await HeroCore.shutdown();
  }

  public async run(path: string, manifest: IDataboxManifest, input: any): Promise<{ output: any }> {
    const script = await this.getVMScript(path, manifest);
    const databoxWrapper = this.vm.run(script);

    if (!(databoxWrapper instanceof DataboxWrapper)) {
      throw new Error(
        'The default export from this script needs to inherit from "@ulixee/databox-for-hero"',
      );
    }

    const output = await databoxWrapper.run({
      input,
      connectionToCore: this.connectionToHeroCore,
    });
    return { output };
  }

  public canSatisfyVersion(version: string): boolean {
    return isSemverSatisfied(version, HeroVersion);
  }

  private getVMScript(path: string, manifest: IDataboxManifest): Promise<VMScript> {
    if (this.compiledScriptsByPath.has(path)) {
      return this.compiledScriptsByPath.get(path);
    }

    const script = new Promise<VMScript>(async resolve => {
      const file = await Fs.promises.readFile(path, 'utf8');
      const vmScript = new VMScript(file, {
        filename: manifest.scriptEntrypoint,
      }).compile();
      resolve(vmScript);
    });

    this.compiledScriptsByPath.set(path, script);
    return script;
  }

  public static register(): void {
    DataboxCore.registerModule(new DataboxForHeroCore());
  }
}
