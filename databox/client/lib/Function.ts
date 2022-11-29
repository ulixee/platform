import { ExtractSchemaType } from '@ulixee/schema';
import FunctionInternal from './FunctionInternal';
import Autorun from './utils/Autorun';
import readCommandLineArgs from './utils/readCommandLineArgs';
import { IFunctionPluginConstructor } from '../interfaces/IFunctionPluginStatics';
import IFunctionContext from '../interfaces/IFunctionContext';
import IFunctionSchema from '../interfaces/IFunctionSchema';
import IFunctionExecOptions from '../interfaces/IFunctionExecOptions';
import IFunctionComponents from '../interfaces/IFunctionComponents';
import FunctionPlugins from './FunctionPlugins';

export default class Function<
  ISchema extends IFunctionSchema = IFunctionSchema<any, any>,
  IPlugin1 extends IFunctionPluginConstructor<ISchema> = IFunctionPluginConstructor<ISchema>,
  IPlugin2 extends IFunctionPluginConstructor<ISchema> = IFunctionPluginConstructor<ISchema>,
  IPlugin3 extends IFunctionPluginConstructor<ISchema> = IFunctionPluginConstructor<ISchema>,
  IRunContext extends IFunctionContext<ISchema> = IFunctionContext<ISchema> &
    IPlugin1['runContextAddons'] &
    IPlugin2['runContextAddons'] &
    IPlugin3['runContextAddons'],
  IBeforeRunContext extends IFunctionContext<ISchema> = IFunctionContext<ISchema> &
    IPlugin1['beforeRunContextAddons'] &
    IPlugin2['beforeRunContextAddons'] &
    IPlugin3['beforeRunContextAddons'],
  IAfterRunContext extends IFunctionContext<ISchema> = IFunctionContext<ISchema> &
    IPlugin1['afterRunContextAddons'] &
    IPlugin2['afterRunContextAddons'] &
    IPlugin3['afterRunContextAddons'],
> {
  #isRunning = false;
  public readonly plugins: FunctionPlugins<
    ISchema,
    IRunContext,
    IBeforeRunContext,
    IAfterRunContext
  >;

  public get schema(): ISchema {
    return this.components.schema;
  }

  public disableAutorun: boolean;
  public successCount = 0;
  public errorCount = 0;

  private readonly components: IFunctionComponents<
    ISchema,
    IRunContext,
    IBeforeRunContext,
    IAfterRunContext
  > &
    IPlugin1['componentAddons'] &
    IPlugin2['componentAddons'] &
    IPlugin3['componentAddons'];

  constructor(
    components: (
      | IFunctionComponents<ISchema, IRunContext, IBeforeRunContext, IAfterRunContext>
      | IFunctionComponents<ISchema, IRunContext, IBeforeRunContext, IAfterRunContext>['run']
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

      const lifecycle = await this.plugins.initialize(functionInternal);

      let execError: Error;
      try {
        if (this.components.beforeRun && lifecycle.beforeRun.isEnabled) {
          await this.components.beforeRun(lifecycle.beforeRun.context);
        }
        if (this.components.run && lifecycle.run.isEnabled) {
          await this.components.run(lifecycle.run.context);
        }
        if (this.components.afterRun && lifecycle.afterRun.isEnabled) {
          await this.components.afterRun(lifecycle.afterRun.context);
        }
      } catch (error) {
        execError = error;
      }

      await this.plugins.setResolution(functionInternal.output, execError);

      if (execError) throw execError;

      functionInternal.validateOutput();

      this.successCount++;
      return functionInternal.output;
    } catch (error) {
      error.stack = error.stack.split('at async Function.exec').shift().trim();
      console.error(`ERROR running databox: `, error);
      this.errorCount++;
      throw error;
    } finally {
      await functionInternal.close();
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
