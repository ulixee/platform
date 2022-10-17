import IDataboxExecutable from '@ulixee/databox-interfaces/IDataboxExecutable';
import IBasicInput from '@ulixee/databox-interfaces/IBasicInput';
import IDataboxExecOptions from '@ulixee/databox-interfaces/IDataboxExecOptions';
import DataboxInternal from './DataboxInternal';
import RunnerObject from './RunnerObject';
import Autorun from './utils/Autorun';
import IComponentsBase, { IRunFnBase } from '../interfaces/IComponentsBase';
import readCommandLineArgs from './utils/readCommandLineArgs';
import Plugins from './Plugins';

const pkg = require('../package.json');

export default class DataboxExecutable<
    TInput = IBasicInput,
    TOutput = any,
    TDataboxExecOptions = IDataboxExecOptions<any>,
  > implements IDataboxExecutable
{
  #isRunning = false;
  public readonly coreVersion = pkg.version;
  public readonly corePlugins: { [name: string]: string } = {};
  public readonly plugins: Plugins<TInput, TOutput>;

  public disableAutorun: boolean;
  public successCount = 0;
  public errorCount = 0;

  private readonly components: IComponentsBase<any, any>;

  constructor(components: IRunFnBase<any> | IComponentsBase<any, any>) {
    this.components =
      typeof components === 'function'
        ? ({
            run: components,
          } as IComponentsBase<any, any>)
        : ({ ...components } as IComponentsBase<any, any>);

    this.plugins = new Plugins(this.components, this.corePlugins);
    this.disableAutorun = Boolean(
      JSON.parse(process.env.ULX_DATABOX_DISABLE_AUTORUN?.toLowerCase() ?? 'false'),
    );
  }

  public async exec(options: TDataboxExecOptions): Promise<TOutput> {
    if (this.#isRunning) {
      throw new Error('Databox already running');
    }
    this.#isRunning = true;
    const databoxInternal = this.createDataboxInternal(options);

    try {
      await this.plugins.onExec(databoxInternal, options, this.components.defaults);

      if (this.components.run && this.plugins.shouldRun) {
        const runnerObject = new RunnerObject<TInput, TOutput>(databoxInternal);
        await this.plugins.onBeforeRun(runnerObject);
        await databoxInternal.execRunner(runnerObject, this.components.run);
      }

      await this.plugins.onBeforeClose();

      this.successCount++;
      return databoxInternal.output;
    } catch (error) {
      console.error(`ERROR running databox: `, error);
      this.errorCount++;
      throw error;
    } finally {
      await databoxInternal.close();
      await this.plugins.onClose();
      this.#isRunning = false;
    }
  }

  private createDataboxInternal(options: TDataboxExecOptions): DataboxInternal<TInput, TOutput> {
    return new DataboxInternal(options, this.components.defaults);
  }

  public static commandLineExec<TOutput>(
    databoxExecutable: DataboxExecutable<any, any>,
  ): Promise<TOutput | Error> {
    const options = readCommandLineArgs();
    return databoxExecutable.exec(options).catch(err => err);
  }
}

Autorun.setupAutorunBeforeExitHook(DataboxExecutable, module.parent, require.main);
