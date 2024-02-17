import { SqlParser } from '@ulixee/sql-engine';
import { ExtractSchemaType } from '@ulixee/schema';
import addGlobalInstance from '@ulixee/commons/lib/addGlobalInstance';
import ExtractorInternal from './ExtractorInternal';
import { IExtractorPluginConstructor } from '../interfaces/IExtractorPluginStatics';
import IExtractorContext from '../interfaces/IExtractorContext';
import IExtractorSchema from '../interfaces/IExtractorSchema';
import IExtractorRunOptions from '../interfaces/IExtractorRunOptions';
import IExtractorComponents from '../interfaces/IExtractorComponents';
import ExtractorPlugins from './ExtractorPlugins';
import DatastoreInternal, { IDatastoreBinding, IQueryInternalCallbacks } from './DatastoreInternal';
import ResultIterable from './ResultIterable';

export default class Extractor<
  TSchema extends IExtractorSchema = IExtractorSchema,
  TPlugin1 extends IExtractorPluginConstructor<TSchema> = IExtractorPluginConstructor<TSchema>,
  TPlugin2 extends IExtractorPluginConstructor<TSchema> = IExtractorPluginConstructor<TSchema>,
  TPlugin3 extends IExtractorPluginConstructor<TSchema> = IExtractorPluginConstructor<TSchema>,
  TContext extends IExtractorContext<TSchema> = IExtractorContext<TSchema> &
    TPlugin1['contextAddons'] &
    TPlugin2['contextAddons'] &
    TPlugin3['contextAddons'],
  TOutput extends ExtractSchemaType<TSchema['output']> = ExtractSchemaType<TSchema['output']>,
  TRunArgs extends IExtractorRunOptions<TSchema> &
    TPlugin1['runArgAddons'] &
    TPlugin2['runArgAddons'] &
    TPlugin3['runArgAddons'] = IExtractorRunOptions<TSchema> &
    TPlugin1['runArgAddons'] &
    TPlugin2['runArgAddons'] &
    TPlugin3['runArgAddons'],
> {
  #isRunning = false;
  #datastoreInternal: DatastoreInternal;

  // dummy type holders
  declare readonly schemaType: {
    input: ExtractSchemaType<TSchema['input']>;
    output: ExtractSchemaType<TSchema['output']>;
  };

  declare readonly runArgsType: TRunArgs;

  public extractorType = 'basic';
  public corePlugins: { [name: string]: string } = {};
  public pluginClasses: IExtractorPluginConstructor<TSchema>[] = [];
  public successCount = 0;
  public errorCount = 0;
  public basePrice = 0;

  public get schema(): TSchema {
    return this.components.schema;
  }

  public get name(): string {
    return this.components.name;
  }

  public get description(): string | undefined {
    return this.components.description;
  }

  protected get datastoreInternal(): DatastoreInternal {
    this.#datastoreInternal ??= new DatastoreInternal({ extractors: { [this.name]: this } });
    return this.#datastoreInternal;
  }

  protected readonly components: IExtractorComponents<TSchema, TContext> &
    TPlugin1['componentAddons'] &
    TPlugin2['componentAddons'] &
    TPlugin3['componentAddons'];

  constructor(
    components: (
      | IExtractorComponents<TSchema, TContext>
      | IExtractorComponents<TSchema, TContext>['run']
    ) &
      TPlugin1['componentAddons'] &
      TPlugin2['componentAddons'] &
      TPlugin3['componentAddons'],
    ...plugins: [plugin1?: TPlugin1, plugin2?: TPlugin2, plugin3?: TPlugin3]
  ) {
    this.components =
      typeof components === 'function'
        ? {
            run: components,
          }
        : { ...components };

    this.components.name ??= 'default';
    for (const Plugin of plugins) {
      if (!Plugin) continue;
      this.pluginClasses.push(Plugin);
      const plugin = new Plugin(this.components);
      this.corePlugins[plugin.name] = plugin.version;
    }
    this.basePrice = this.components.basePrice ?? 0;
  }

  public runInternal(
    options: TRunArgs,
    callbacks?: IQueryInternalCallbacks,
  ): ResultIterable<TOutput, Record<string, any>> {
    if (this.#isRunning) {
      throw new Error('Datastore already running');
    }
    const resultsIterable = new ResultIterable<TOutput>();

    callbacks ??= {};
    callbacks.onFunction ??= async (_name, opts, run) => run(opts);

    callbacks
      .onFunction(this.name, options, async finalOptions => {
        const extractorInternal = new ExtractorInternal<TSchema>(finalOptions, this.components);
        const plugins = new ExtractorPlugins<TSchema, TContext>(
          this.components,
          this.pluginClasses,
        );
        let context: TContext;
        try {
          this.#isRunning = true;
          extractorInternal.validateInput();
          context = await plugins.initialize(extractorInternal, this.datastoreInternal, callbacks);

          const extractorResults = extractorInternal.run(context);

          let counter = 0;
          for await (const output of extractorResults) {
            extractorInternal.validateOutput(output, counter++);
            resultsIterable.push(output as TOutput);
          }

          await plugins.setResolution(extractorInternal.outputs);
          this.successCount++;
        } catch (error) {
          this.errorCount++;
          error.stack = error.stack.split('at Extractor.runInternal').shift().trim();

          await plugins.setResolution(null, error).catch(() => null);
          resultsIterable.reject(error);
        } finally {
          await extractorInternal.close();
          this.#isRunning = false;
          resultsIterable.done();
        }
      })
      .catch(resultsIterable.reject);
    return resultsIterable;
  }

  public async queryInternal(
    sql: string,
    boundValues: any[] = [],
    options?: TRunArgs,
  ): Promise<any> {
    const name = this.components.name;

    const sqlParser = new SqlParser(sql, { function: name });
    if (!sqlParser.isSelect()) {
      throw new Error('Invalid SQL command');
    }

    const inputsByFunction = sqlParser.extractFunctionCallInputs(boundValues);
    const input = inputsByFunction[name];
    const records = await this.runInternal({ input } as TRunArgs);
    const engine = this.datastoreInternal.storageEngine;
    return engine.query(sqlParser, boundValues, options as any, {
      [name]: { records, parameters: input },
    });
  }

  public attachToDatastore(
    datastoreInternal: DatastoreInternal<any, any>,
    extractorName: string,
  ): void {
    this.components.name = extractorName;
    if (this.#datastoreInternal && this.#datastoreInternal === datastoreInternal) return;
    if (this.#datastoreInternal) {
      throw new Error(`${extractorName} Extractor is already attached to a Datastore`);
    }

    this.#datastoreInternal = datastoreInternal;
  }

  public bind(config: IDatastoreBinding): Promise<DatastoreInternal> {
    return this.datastoreInternal.bind(config ?? {});
  }
}

addGlobalInstance(Extractor);
