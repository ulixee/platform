import IDataboxExecOptions from "@ulixee/databox-interfaces/IDataboxExecOptions";
import IDataboxPlugin from "@ulixee/databox-interfaces/IDataboxPlugin";
import IComponents from "../interfaces/IComponents";
import DataboxInternal from "./DataboxInternal";
import DataboxObject from './DataboxObject';

export default class Plugins<TInput, TOutput> {
  #components: IComponents<TInput, TOutput, any, any>;

  private clientPlugins: IDataboxPlugin<TInput, TOutput>[] = [];
  private corePlugins: { [name: string]: string };

  constructor(components: IComponents<TInput, TOutput, any, any>, corePlugins) {
    this.#components = components;
    this.corePlugins = corePlugins;
  }

  get shouldRun(): boolean {
    const hasShouldRunCheck = this.clientPlugins.some(x => x.shouldRun !== undefined);
    return !hasShouldRunCheck || this.clientPlugins.some(x => x.shouldRun !== undefined && x.shouldRun);
  }

  public add(Plugin): void {
    const plugin = new Plugin(this.#components);
    this.clientPlugins.push(plugin);
    this.corePlugins[plugin.name] = plugin.version;
  }

  public async onExec(
    databoxInternal: DataboxInternal<TInput, TOutput>,
    execOptions: IDataboxExecOptions, 
    defaults: any,
  ): Promise<void> {
    const promises = this.clientPlugins.map(x => x.onExec && x.onExec(databoxInternal, execOptions || {}, defaults || {}));
    await Promise.all(promises);
  }
  
  public async onBeforeRun(databoxObject: DataboxObject<TInput, TOutput>): Promise<void> {
    const promises = this.clientPlugins.map(x => x.onBeforeRun && x.onBeforeRun(databoxObject));
    await Promise.all(promises);
  }

  public async onBeforeClose(): Promise<void> {
    const promises = this.clientPlugins.map(x => x.onBeforeClose && x.onBeforeClose());
    await Promise.all(promises);
  }
  
  public async onClose(): Promise<void> {
    const promises = this.clientPlugins.map(x => x.onClose && x.onClose());
    await Promise.all(promises);
  }
}
