import Resolvable from '@ulixee/commons/lib/Resolvable';
import IExtractorPlugin from '../interfaces/IExtractorPlugin';
import IExtractorSchema from '../interfaces/IExtractorSchema';
import IExtractorContext from '../interfaces/IExtractorContext';
import IExtractorComponents from '../interfaces/IExtractorComponents';
import ExtractorInternal from './ExtractorInternal';
import ExtractorContext from './ExtractorContext';
import DatastoreInternal, { IQueryInternalCallbacks } from './DatastoreInternal';

export default class ExtractorPlugins<
  ISchema extends IExtractorSchema,
  IRunContext extends IExtractorContext<ISchema> = IExtractorContext<ISchema>,
> {
  #components: IExtractorComponents<ISchema, IExtractorContext<ISchema>>;
  private clientPlugins: IExtractorPlugin<ISchema>[] = [];
  private pluginNextPromises: Resolvable<IExtractorContext<ISchema>['outputs']>[] = [];
  private pluginRunPromises: Promise<Error | void>[] = [];

  constructor(
    components: IExtractorComponents<ISchema, IExtractorContext<ISchema>>,
    plugins: (new (
      comps: IExtractorComponents<ISchema, IExtractorContext<ISchema>>,
    ) => IExtractorPlugin<ISchema>)[],
  ) {
    this.#components = components;

    for (const Plugin of plugins) {
      const plugin = new Plugin(this.#components);
      this.clientPlugins.push(plugin);
    }
  }

  public async initialize(
    extractorInternal: ExtractorInternal<ISchema>,
    datastoreInternal: DatastoreInternal,
    callbacks: IQueryInternalCallbacks,
  ): Promise<IRunContext> {
    const context = new ExtractorContext(extractorInternal, datastoreInternal, callbacks);

    // plugin `run` phases
    for (const plugin of this.clientPlugins) {
      const outputPromise = new Resolvable<IExtractorContext<ISchema>['outputs']>();
      this.pluginNextPromises.push(outputPromise);

      await new Promise<void>((resolve, reject) => {
        try {
          const promise = plugin
            .run(extractorInternal, context, () => {
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
