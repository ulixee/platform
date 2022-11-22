import { ExtractSchemaType } from '@ulixee/schema';
import FunctionInternal from './FunctionInternal';
import FunctionContext from './FunctionContext';
import Autorun from './utils/Autorun';
import readCommandLineArgs from './utils/readCommandLineArgs';
import FunctionPlugins from './FunctionPlugins';
import { IFunctionPluginConstructor } from '../interfaces/IFunctionPluginStatics';
import IFunctionContext from '../interfaces/IFunctionContext';
import IFunctionSchema from '../interfaces/IFunctionSchema';
import IFunctionExecOptions from '../interfaces/IFunctionExecOptions';
import IFunctionComponents from '../interfaces/IFunctionComponents';

export default class Function<
  ISchema extends IFunctionSchema = IFunctionSchema<any, any>,
  IPlugin1 extends IFunctionPluginConstructor<ISchema> = IFunctionPluginConstructor<ISchema>,
  IPlugin2 extends IFunctionPluginConstructor<ISchema> = IFunctionPluginConstructor<ISchema>,
  IPlugin3 extends IFunctionPluginConstructor<ISchema> = IFunctionPluginConstructor<ISchema>,
  IContext extends IFunctionContext<ISchema> = IFunctionContext<ISchema> &
    IPlugin1['contextAddons'] &
    IPlugin2['contextAddons'] &
    IPlugin3['contextAddons'],
> {
  #isRunning = false;
  public readonly plugins: FunctionPlugins<ISchema>;

  public get schema(): ISchema {
    return this.components.schema;
  }

  public disableAutorun: boolean;
  public successCount = 0;
  public errorCount = 0;

  private readonly components: IFunctionComponents<ISchema, IContext> &
    IPlugin1['componentAddons'] &
    IPlugin2['componentAddons'] &
    IPlugin3['componentAddons'];

  constructor(
    components: (
      | IFunctionComponents<ISchema, IContext>
      | IFunctionComponents<ISchema, IContext>['run']
    ) &
      IPlugin1['componentAddons'] &
      IPlugin2['componentAddons'] &
      IPlugin3['componentAddons'],
    ...plugins: [plugin1?: IPlugin1, plugin2?: IPlugin2, plugin3?: IPlugin3]
  ) {
    this.components =
      typeof components === 'function'
        ? {
            run: components,
          }
        : { ...components };

    this.plugins = new FunctionPlugins(this.components);
    this.plugins.add(...plugins);

    this.disableAutorun = Boolean(
      JSON.parse(process.env.ULX_DATABOX_DISABLE_AUTORUN?.toLowerCase() ?? 'false'),
    );
  }

  public async exec(
    options: IFunctionExecOptions<ISchema> &
      IPlugin1['execArgAddons'] &
      IPlugin2['execArgAddons'] &
      IPlugin3['execArgAddons'],
  ): Promise<ExtractSchemaType<ISchema['output']>> {
    if (this.#isRunning) {
      throw new Error('Databox already running');
    }
    this.#isRunning = true;
    const functionInternal = new FunctionInternal(options, this.components);

    try {
      functionInternal.validateInput();
      await this.plugins.onStart(functionInternal);

      if (this.components.run && this.plugins.shouldRun) {
        const context = new FunctionContext(functionInternal);
        await this.plugins.beforeRun(context);
        await functionInternal.execRunner(context, this.components.run as any);
      }

      await this.plugins.beforeClose();
      functionInternal.validateOutput();

      this.successCount++;
      return functionInternal.output;
    } catch (error) {
      console.error(`ERROR running databox: `, error);
      this.errorCount++;
      throw error;
    } finally {
      await functionInternal.close();
      await this.plugins.onClose();
      this.#isRunning = false;
    }
  }

  public static commandLineExec<TOutput>(
    databoxFunction: Function<any, any, any>,
  ): Promise<TOutput | Error> {
    const options = readCommandLineArgs();
    return databoxFunction.exec(options).catch(err => err);
  }
}

Autorun.setupAutorunBeforeExitHook(Function, module.parent, require.main);
