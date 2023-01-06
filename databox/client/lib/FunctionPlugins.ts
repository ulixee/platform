import Resolvable from '@ulixee/commons/lib/Resolvable';
import IFunctionPlugin from '../interfaces/IFunctionPlugin';
import IFunctionSchema from '../interfaces/IFunctionSchema';
import IFunctionContext from '../interfaces/IFunctionContext';
import IFunctionComponents from '../interfaces/IFunctionComponents';
import FunctionInternal from './FunctionInternal';
import FunctionContext from './FunctionContext';
import DataboxInternal from './DataboxInternal';

export default class FunctionPlugins<
  ISchema extends IFunctionSchema,
  IRunContext extends IFunctionContext<ISchema> = IFunctionContext<ISchema>,
> {
  #components: IFunctionComponents<ISchema, IFunctionContext<ISchema>>;
  private clientPlugins: IFunctionPlugin<ISchema>[] = [];
  private pluginNextPromises: Resolvable<IFunctionContext<ISchema>['outputs']>[] = [];
  private pluginRunPromises: Promise<Error | void>[] = [];

  constructor(
    components: IFunctionComponents<ISchema, IFunctionContext<ISchema>>,
    plugins: (new (
      comps: IFunctionComponents<ISchema, IFunctionContext<ISchema>>,
    ) => IFunctionPlugin<ISchema>)[],
  ) {
    this.#components = components;

    for (const Plugin of plugins) {
      const plugin = new Plugin(this.#components);
      this.clientPlugins.push(plugin);
    }
  }

  public async initialize(
    functionInternal: FunctionInternal<ISchema>,
    databoxInternal: DataboxInternal,
  ): Promise<IRunContext> {
    const context = new FunctionContext(functionInternal, databoxInternal);

    // plugin `run` phases
    for (const plugin of this.clientPlugins) {
      const outputPromise = new Resolvable<IFunctionContext<ISchema>['outputs']>();
      this.pluginNextPromises.push(outputPromise);

      await new Promise<void>((resolve, reject) => {
        try {
          const promise = plugin
            .run(functionInternal, context, () => {
              // wait for next to be called
              resolve();
              return outputPromise.promise;
            })
            .catch(err => err)
            // if promise resolves, next wasn't called... don't hang
            .finally(resolve);
          this.pluginRunPromises.push(promise);
        } catch (error) {
          reject(error);
        }
      });
    }

    return context as any;
  }

  public async setResolution(outputs: IRunContext['outputs'], error?: Error): Promise<void> {
    // Resolve plugin next promises
    for (const promise of this.pluginNextPromises) {
      if (error) promise.reject(error);
      else promise.resolve(outputs);
    }

    // wait for all plugins to complete
    const results = await Promise.all(this.pluginRunPromises);
    for (const result of results) {
      if (result instanceof Error && result !== error) throw result;
    }
  }
}
