import { SqlParser } from '@ulixee/sql-engine';
import { parseEnvBool } from '@ulixee/commons/lib/envUtils';
import { ExtractSchemaType } from '@ulixee/schema';
import RunnerInternal from './RunnerInternal';
import readCommandLineArgs from './utils/readCommandLineArgs';
import { IRunnerPluginConstructor } from '../interfaces/IRunnerPluginStatics';
import IRunnerContext from '../interfaces/IRunnerContext';
import IRunnerSchema from '../interfaces/IRunnerSchema';
import IRunnerExecOptions from '../interfaces/IRunnerExecOptions';
import IRunnerComponents from '../interfaces/IRunnerComponents';
import RunnerPlugins from './RunnerPlugins';
import DatastoreInternal, { IDatastoreBinding } from './DatastoreInternal';
import ResultIterable from './ResultIterable';
import SqlQuery from './SqlQuery';

const disableColors = parseEnvBool(process.env.NODE_DISABLE_COLORS) ?? false;

export default class Runner<
  TSchema extends IRunnerSchema = IRunnerSchema,
  TPlugin1 extends IRunnerPluginConstructor<TSchema> = IRunnerPluginConstructor<TSchema>,
  TPlugin2 extends IRunnerPluginConstructor<TSchema> = IRunnerPluginConstructor<TSchema>,
  TPlugin3 extends IRunnerPluginConstructor<TSchema> = IRunnerPluginConstructor<TSchema>,
  TContext extends IRunnerContext<TSchema> = IRunnerContext<TSchema> &
    TPlugin1['contextAddons'] &
    TPlugin2['contextAddons'] &
    TPlugin3['contextAddons'],
  TOutput extends ExtractSchemaType<TSchema['output']> = ExtractSchemaType<TSchema['output']>,
  TRunArgs extends IRunnerExecOptions<TSchema> &
    TPlugin1['execArgAddons'] &
    TPlugin2['execArgAddons'] &
    TPlugin3['execArgAddons'] = IRunnerExecOptions<TSchema> &
    TPlugin1['execArgAddons'] &
    TPlugin2['execArgAddons'] &
    TPlugin3['execArgAddons'],
> {
  #isRunning = false;
  #datastoreInternal: DatastoreInternal;

  // dummy type holders
  declare readonly schemaType: {
    input: ExtractSchemaType<TSchema['input']>;
    output: ExtractSchemaType<TSchema['output']>;
  };

  declare readonly runArgsType: TRunArgs;

  public runnerType = 'basic';
  public corePlugins: { [name: string]: string } = {};
  public pluginClasses: IRunnerPluginConstructor<TSchema>[] = [];
  public successCount = 0;
  public errorCount = 0;
  public pricePerQuery = 0;
  public minimumPrice?: number;
  public addOnPricing?: {
    perKb?: number;
  };

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
    this.#datastoreInternal ??= new DatastoreInternal({ runners: { [this.name]: this } });
    return this.#datastoreInternal;
  }

  protected readonly components: IRunnerComponents<TSchema, TContext> &
    TPlugin1['componentAddons'] &
    TPlugin2['componentAddons'] &
    TPlugin3['componentAddons'];

  constructor(
    components: (
      | IRunnerComponents<TSchema, TContext>
      | IRunnerComponents<TSchema, TContext>['run']
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
    this.pricePerQuery = this.components.pricePerQuery ?? 0;
    this.addOnPricing = this.components.addOnPricing;
    this.minimumPrice = this.components.minimumPrice;
  }

  public runInternal(options: TRunArgs, logOutputResult = false): ResultIterable<TOutput> {
    if (this.#isRunning) {
      throw new Error('Datastore already running');
    }
    const resultsIterable = new ResultIterable<TOutput>();

    (async () => {
      const runnerInternal = new RunnerInternal<TSchema>(options, this.components);
      const plugins = new RunnerPlugins<TSchema, TContext>(this.components, this.pluginClasses);
      try {
        this.#isRunning = true;
        runnerInternal.validateInput();
        const context = await plugins.initialize(runnerInternal, this.datastoreInternal);

        const runnerResults = runnerInternal.run(context);

        let counter = 0;
        for await (const output of runnerResults) {
          runnerInternal.validateOutput(output, counter++);
          if (logOutputResult) {
            // eslint-disable-next-line no-console
            console.dir(output, { colors: !disableColors, depth: null, getters: false });
          }
          resultsIterable.push(output as TOutput);
        }

        await plugins.setResolution(runnerInternal.outputs);
        this.successCount++;
      } catch (error) {
        this.errorCount++;
        error.stack = error.stack.split('at Runner.runInternal').shift().trim();
        if (logOutputResult) {
          error[Symbol.for('Runner.hasLogged')] = true;
          console.error(error);
        }
        await plugins.setResolution(null, error).catch(() => null);
        resultsIterable.reject(error);
      } finally {
        await runnerInternal.close();
        this.#isRunning = false;
        resultsIterable.done();
      }
    })().catch(err => console.error('Error streaming Runner results', err));
    return resultsIterable;
  }

  public async queryInternal(sql: string, boundValues: any[] = []): Promise<any> {
    const name = this.components.name;

    const sqlParser = new SqlParser(sql, { function: name });
    if (!sqlParser.isSelect()) {
      throw new Error('Invalid SQL command');
    }

    const inputsByFunction = sqlParser.extractFunctionCallInputs<TSchema['input']>(
      { [name]: this.schema.input },
      boundValues,
    );
    const input = inputsByFunction[name];
    const outputs = await this.runInternal({ input } as TRunArgs);

    const query = new SqlQuery(sqlParser, this.datastoreInternal.storage);
    return query.execute(inputsByFunction, { [name]: outputs }, {}, boundValues);
  }

  public attachToDatastore(
    datastoreInternal: DatastoreInternal<any, any>,
    runnerName: string,
  ): void {
    this.components.name = runnerName;
    if (this.#datastoreInternal && this.#datastoreInternal === datastoreInternal) return;
    if (this.#datastoreInternal) {
      throw new Error(`${runnerName} Runner is already attached to a Datastore`);
    }

    this.#datastoreInternal = datastoreInternal;
  }

  public bind(config: IDatastoreBinding): void {
    this.datastoreInternal.bind(config ?? {});
  }

  public static commandLineExec<T>(datastoreRunner: Runner<any, any, any>): ResultIterable<T> {
    const options = readCommandLineArgs();
    return datastoreRunner.runInternal(options, process.env.NODE_ENV !== 'test');
  }
}
