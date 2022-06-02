import HeroCore from '@ulixee/hero-core';
import { isSemverSatisfied } from '@ulixee/commons/lib/VersionUtils';
import IDataboxModuleRunner from '@ulixee/databox-core/interfaces/IDataboxModuleRunner';
import DataboxCore from '@ulixee/databox-core';
import { ConnectionToHeroCore, createDirectConnectionToCore } from '@ulixee/hero-fullstack';
import IDataboxManifest from '@ulixee/databox-interfaces/IDataboxManfiest';
import { NodeVM, VMScript } from 'vm2';
import DataboxWrapper from '@ulixee/databox-for-hero';
import * as Fs from 'fs';
import { DataboxRunSettings } from '@ulixee/databox-for-hero/lib/DataboxWrapper';

const { version: HeroVersion } = require('@ulixee/hero-core/package.json');

export default class DataboxForHeroCore implements IDataboxModuleRunner {
  public runsDataboxModuleVersion: string = HeroVersion;
  public runsDataboxModule = '@ulixee/databox-for-hero';

  private compiledScriptsByPath = new Map<string, Promise<VMScript>>();

  private connectionToLocalHeroCore: ConnectionToHeroCore;
  private vm = new NodeVM({
    console: 'inherit',
    sandbox: {},
    wasm: false,
    eval: false,
    wrapper: 'commonjs',
    strict: true,
    require: {
      builtin: [],
      external: ['@ulixee/*', '@unblocked-web/*', 'awaited-dom'],
    },
  });

  public async start(): Promise<void> {
    DataboxRunSettings.runLater = true;
    await HeroCore.start();
    this.connectionToLocalHeroCore = createDirectConnectionToCore();
  }

  public async close(): Promise<void> {
    if (this.connectionToLocalHeroCore) await this.connectionToLocalHeroCore.disconnect();
    await HeroCore.shutdown();
  }

  public async run(path: string, manifest: IDataboxManifest, input: any): Promise<{ output: any }> {
    const script = await this.getVMScript(path, manifest);
    const databoxWrapper: DataboxWrapper = this.vm.run(script);

    if (!(databoxWrapper instanceof DataboxWrapper)) {
      throw new Error(
        'The default export from this script needs to inherit from "@ulixee/databox-for-hero"',
      );
    }

    const output = await databoxWrapper.run({
      mode: 'production',
      input,
      connectionToCore: this.connectionToLocalHeroCore,
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
