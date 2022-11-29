import Resolvable from '@ulixee/commons/lib/Resolvable';
import IFunctionPlugin, { IFunctionLifecycle } from '../interfaces/IFunctionPlugin';
import IFunctionSchema from '../interfaces/IFunctionSchema';
import IFunctionContext from '../interfaces/IFunctionContext';
import IFunctionComponents from '../interfaces/IFunctionComponents';
import FunctionInternal from './FunctionInternal';
import FunctionContext from './FunctionContext';

export default class FunctionPlugins<
  ISchema extends IFunctionSchema,
  IRunContext extends IFunctionContext<ISchema> = IFunctionContext<ISchema>,
  IBeforeRunContext extends IFunctionContext<ISchema> = IFunctionContext<ISchema>,
  IAfterRunContext extends IFunctionContext<ISchema> = IFunctionContext<ISchema>,
> {
  public corePlugins: { [name: string]: string } = {};

  #components: IFunctionComponents<ISchema, IFunctionContext<ISchema>>;
  private clientPlugins: IFunctionPlugin<ISchema>[] = [];
  private pluginNextPromises: Resolvable<ISchema['output']>[] = [];
  private pluginRunPromises: Promise<Error | void>[] = [];

  constructor(components: IFunctionComponents<ISchema, IFunctionContext<ISchema>>) {
    this.#components = components;
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

  public async initialize(
    functionInternal: FunctionInternal<ISchema>,
  ): Promise<IFunctionLifecycle<ISchema, IRunContext, IBeforeRunContext, IAfterRunContext>> {
    const lifecycle: IFunctionLifecycle<ISchema, IRunContext, IBeforeRunContext, IAfterRunContext> =
      {
        beforeRun: {
          isEnabled: !!this.#components.beforeRun,
          context: new FunctionContext(functionInternal) as any,
        },
        run: {
          isEnabled: !!this.#components.run,
          context: new FunctionContext(functionInternal) as any,
        },
        afterRun: {
          isEnabled: !!this.#components.afterRun,
          context: new FunctionContext(functionInternal) as any,
        },
      };

    // 1. Plugin `run` phases
    for (const plugin of this.clientPlugins) {
      const outputPromise = new Resolvable<ISchema['output']>();
      this.pluginNextPromises.push(outputPromise);

      await new Promise<void>((resolve, reject) => {
        try {
          const promise = plugin
            .run(functionInternal, lifecycle, () => {
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

    return lifecycle;
  }

  public async setResolution(output: ISchema['output'], error: Error): Promise<void> {
    // Resolve plugin next promises
    for (const promise of this.pluginNextPromises) {
      if (error) promise.reject(error);
      else promise.resolve(output);
    }

    // wait for all plugins to complete
    const results = await Promise.all(this.pluginRunPromises);
    for (const result of results) {
      if (result instanceof Error) throw result;
    }
  }
}
