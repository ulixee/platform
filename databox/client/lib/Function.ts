import { SqlParser } from '@ulixee/sql-engine';
import { parseEnvBool } from '@ulixee/commons/lib/envUtils';
import { ExtractSchemaType } from '@ulixee/schema';
import FunctionInternal from './FunctionInternal';
import readCommandLineArgs from './utils/readCommandLineArgs';
import { IFunctionPluginConstructor } from '../interfaces/IFunctionPluginStatics';
import IFunctionContext from '../interfaces/IFunctionContext';
import IFunctionSchema from '../interfaces/IFunctionSchema';
import IFunctionExecOptions from '../interfaces/IFunctionExecOptions';
import IFunctionComponents from '../interfaces/IFunctionComponents';
import FunctionPlugins from './FunctionPlugins';
import DataboxInternal from './DataboxInternal';
import ResultIterable from './ResultIterable';

const disableColors = parseEnvBool(process.env.NODE_DISABLE_COLORS) ?? false;

export default class Function<
  TSchema extends IFunctionSchema = IFunctionSchema,
  TPlugin1 extends IFunctionPluginConstructor<TSchema> = IFunctionPluginConstructor<TSchema>,
  TPlugin2 extends IFunctionPluginConstructor<TSchema> = IFunctionPluginConstructor<TSchema>,
  TPlugin3 extends IFunctionPluginConstructor<TSchema> = IFunctionPluginConstructor<TSchema>,
  TContext extends IFunctionContext<TSchema> = IFunctionContext<TSchema> &
    TPlugin1['contextAddons'] &
    TPlugin2['contextAddons'] &
    TPlugin3['contextAddons'],
  TOutput extends ExtractSchemaType<TSchema['output']> = ExtractSchemaType<TSchema['output']>,
> {
  #isRunning = false;
  #databoxInternal: DataboxInternal;

  // dummy type holder
  declare readonly schemaType: ExtractSchemaType<TSchema>;

  public functionType = 'basic';
  public corePlugins: { [name: string]: string } = {};
  public pluginClasses: IFunctionPluginConstructor<TSchema>[] = [];
  public disableAutorun: boolean;
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

  protected get databoxInternal(): DataboxInternal {
    if (!this.#databoxInternal) {
      this.#databoxInternal = new DataboxInternal({ functions: { [this.name]: this } });
      this.#databoxInternal.onCreateInMemoryDatabase(this.createInMemoryFunction.bind(this));
    }
    return this.#databoxInternal;
  }

  protected readonly components: IFunctionComponents<TSchema, TContext> &
    TPlugin1['componentAddons'] &
    TPlugin2['componentAddons'] &
    TPlugin3['componentAddons'];

  constructor(
    components: (
      | IFunctionComponents<TSchema, TContext>
      | IFunctionComponents<TSchema, TContext>['run']
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

    this.disableAutorun = Boolean(
      JSON.parse(process.env.ULX_DATABOX_DISABLE_AUTORUN?.toLowerCase() ?? 'false'),
    );
  }

  public stream(
    options: IFunctionExecOptions<TSchema> &
      TPlugin1['execArgAddons'] &
      TPlugin2['execArgAddons'] &
      TPlugin3['execArgAddons'],
    logOutputResult = false,
  ): ResultIterable<TOutput> {
    if (this.#isRunning) {
      throw new Error('Databox already running');
    }
    const resultsIterable = new ResultIterable<TOutput>();

    (async () => {
      const functionInternal = new FunctionInternal<TSchema>(options, this.components);
      const plugins = new FunctionPlugins<TSchema, TContext>(this.components, this.pluginClasses);
      try {
        this.#isRunning = true;
        functionInternal.validateInput();
        const context = await plugins.initialize(functionInternal, this.databoxInternal);

        const functionResults = functionInternal.run(context);

        let counter = 0;
        for await (const output of functionResults) {
          functionInternal.validateOutput(output, counter++);
          if (logOutputResult) {
            // eslint-disable-next-line no-console
            console.dir(output, { colors: !disableColors, depth: null, getters: false });
          }
          resultsIterable.push(output as TOutput);
        }

        await plugins.setResolution(functionInternal.outputs);
        this.successCount++;
      } catch (error) {
        this.errorCount++;
        error.stack = error.stack.split('at async Function.stream').shift().trim();
        await plugins.setResolution(null, error).catch(() => null);
        resultsIterable.reject(error);
      } finally {
        await functionInternal.close();
        this.#isRunning = false;
        resultsIterable.done();
      }
    })().catch(err => console.error('Error streaming Function results', err));
    return resultsIterable;
  }

  public async query(sql: string, boundValues: any[] = []): Promise<any> {
    await this.databoxInternal.ensureDatabaseExists();
    const name = this.components.name;
    const databoxInstanceId = this.databoxInternal.instanceId;
    const databoxVersionHash = this.databoxInternal.manifest?.versionHash;

    const sqlParser = new SqlParser(sql, { function: name });
    const schemas = { [name]: this.schema.input };
    const inputsByFunction = sqlParser.extractFunctionInputs<TSchema['input']>(
      schemas,
      boundValues,
    );
    const input = inputsByFunction[name];
    const outputs: any[] = [];

    const results = await this.stream({ input });
    for await (const result of results) outputs.push(result);

    const args = {
      name,
      sql,
      boundValues,
      input,
      outputs,
      databoxInstanceId,
      databoxVersionHash,
    };
    return await this.databoxInternal.sendRequest({
      command: 'Databox.queryInternalFunctionResult',
      args: [args],
    });
  }

  public attachToDatabox(databoxInternal: DataboxInternal<any, any>, functionName: string): void {
    this.components.name = functionName;
    if (this.#databoxInternal && this.#databoxInternal === databoxInternal) return;
    if (this.#databoxInternal) {
      throw new Error(`${functionName} Function is already attached to a Databox`);
    }

    this.#databoxInternal = databoxInternal;
    if (!databoxInternal.manifest?.versionHash) {
      this.#databoxInternal.onCreateInMemoryDatabase(this.createInMemoryFunction.bind(this));
    }
  }

  private async createInMemoryFunction(): Promise<void> {
    const databoxInstanceId = this.databoxInternal.instanceId;
    const name = this.components.name;
    const args = {
      name,
      databoxInstanceId,
      schema: this.components.schema,
    };
    await this.databoxInternal.sendRequest({
      command: 'Databox.createInMemoryFunction',
      args: [args],
    });
  }

  public static commandLineExec<T>(databoxFunction: Function<any, any, any>): ResultIterable<T> {
    const options = readCommandLineArgs();
    return databoxFunction.stream(options, process.env.NODE_ENV !== 'test');
  }
}
