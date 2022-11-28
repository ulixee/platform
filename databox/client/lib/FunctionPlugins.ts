import IFunctionPlugin from '../interfaces/IFunctionPlugin';
import IFunctionSchema from '../interfaces/IFunctionSchema';
import IFunctionContext from '../interfaces/IFunctionContext';
import IFunctionComponents from '../interfaces/IFunctionComponents';
import FunctionInternal from './FunctionInternal';
import FunctionContext from './FunctionContext';

export default class FunctionPlugins<ISchema extends IFunctionSchema>
  implements Omit<IFunctionPlugin<ISchema>, 'name' | 'version' | 'execOptions'>
{
  public corePlugins: { [name: string]: string } = {};

  #components: IFunctionComponents<ISchema, IFunctionContext<ISchema>>;
  private clientPlugins: IFunctionPlugin<ISchema>[] = [];

  constructor(components: IFunctionComponents<ISchema, IFunctionContext<ISchema>>) {
    this.#components = components;
  }

  get shouldRun(): boolean {
    const hasShouldRunDefined = this.clientPlugins.some(x => x.shouldRun !== undefined);
    return !hasShouldRunDefined || this.clientPlugins.some(x => x.shouldRun === true);
  }

  public add(
    ...plugins: (new (
      components: IFunctionComponents<ISchema, IFunctionContext<ISchema>>,
    ) => IFunctionPlugin<ISchema>)[]
  ): void {
    for (const Plugin of plugins) {
      if (!Plugin) continue;
      const plugin = new Plugin(this.#components);
      this.clientPlugins.push(plugin);
      this.corePlugins[plugin.name] = plugin.version;
    }
  }

  public async onStart(functionInternal: FunctionInternal<ISchema>): Promise<void> {
    const promises = this.clientPlugins.map(x => x.onStart && x.onStart(functionInternal));
    await Promise.all(promises);
  }

  public async beforeRun(context: FunctionContext<ISchema>): Promise<void> {
    const promises = this.clientPlugins.map(x => x.beforeRun && x.beforeRun(context));
    await Promise.all(promises);
  }

  public async beforeClose(): Promise<void> {
    const promises = this.clientPlugins.map(x => x.beforeClose && x.beforeClose());
    await Promise.all(promises);
  }

  public async onClose(): Promise<void> {
    const promises = this.clientPlugins.map(x => x.onClose && x.onClose());
    await Promise.all(promises);
  }
}
