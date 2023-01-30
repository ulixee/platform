import Resolvable from '@ulixee/commons/lib/Resolvable';
import IRunnerPlugin from '../interfaces/IRunnerPlugin';
import IRunnerSchema from '../interfaces/IRunnerSchema';
import IRunnerContext from '../interfaces/IRunnerContext';
import IRunnerComponents from '../interfaces/IRunnerComponents';
import RunnerInternal from './RunnerInternal';
import RunnerContext from './RunnerContext';
import DatastoreInternal from './DatastoreInternal';

export default class RunnerPlugins<
  ISchema extends IRunnerSchema,
  IRunContext extends IRunnerContext<ISchema> = IRunnerContext<ISchema>,
> {
  #components: IRunnerComponents<ISchema, IRunnerContext<ISchema>>;
  private clientPlugins: IRunnerPlugin<ISchema>[] = [];
  private pluginNextPromises: Resolvable<IRunnerContext<ISchema>['outputs']>[] = [];
  private pluginRunPromises: Promise<Error | void>[] = [];

  constructor(
    components: IRunnerComponents<ISchema, IRunnerContext<ISchema>>,
    plugins: (new (
      comps: IRunnerComponents<ISchema, IRunnerContext<ISchema>>,
    ) => IRunnerPlugin<ISchema>)[],
  ) {
    this.#components = components;

    for (const Plugin of plugins) {
      const plugin = new Plugin(this.#components);
      this.clientPlugins.push(plugin);
    }
  }

  public async initialize(
    runnerInternal: RunnerInternal<ISchema>,
    datastoreInternal: DatastoreInternal,
  ): Promise<IRunContext> {
    const context = new RunnerContext(runnerInternal, datastoreInternal);

    // plugin `run` phases
    for (const plugin of this.clientPlugins) {
      const outputPromise = new Resolvable<IRunnerContext<ISchema>['outputs']>();
      this.pluginNextPromises.push(outputPromise);

      await new Promise<void>((resolve, reject) => {
        try {
          const promise = plugin
            .run(runnerInternal, context, () => {
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
