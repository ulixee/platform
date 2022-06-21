import IDataboxWrapper from '@ulixee/databox-interfaces/IDataboxWrapper';
import IDataboxRunOptions from '@ulixee/databox-interfaces/IDataboxRunOptions';
import readCommandLineArgs from '../utils/readCommandLineArgs';
import IComponentsBase, { IRunFnBase } from '../../interfaces/IComponentsBase';
import { attemptAutorun } from '../utils/Autorun';
import DataboxInternalAbstract from './DataboxInternalAbstract';

export default abstract class DataboxWrapperAbstract<
  TDataboxInternal extends DataboxInternalAbstract<any, any>,
  TOutput,
  TDataboxRunOptions extends IDataboxRunOptions = IDataboxRunOptions,
  TComponents extends IComponentsBase<any, any> = IComponentsBase<any, any>,
  TRunnerObject = any,
> implements IDataboxWrapper
{
  public static defaultExport: DataboxWrapperAbstract<any, any>;

  public abstract readonly runtimeName: string;
  public abstract readonly runtimeVersion: string;

  public disableAutorun: boolean;
  public successCount = 0;
  public errorCount = 0;

  protected readonly components: TComponents;

  constructor(components: IRunFnBase<TRunnerObject> | TComponents) {
    this.components =
      typeof components === 'function'
        ? ({
            run: components,
          } as TComponents)
        : ({ ...components } as TComponents);

    this.disableAutorun = Boolean(
      JSON.parse(process.env.ULX_DATABOX_DISABLE_AUTORUN?.toLowerCase() ?? 'false'),
    );
  }

  public async run(options: TDataboxRunOptions): Promise<TOutput> {
    let databoxInternal: TDataboxInternal;

    try {
      databoxInternal = this.createDataboxInternal(options);
      await databoxInternal.execRunner(this.components.run);

      this.successCount++;
      return databoxInternal.output;
    } catch (error) {
      console.error(`ERROR running databox: `, error);
      this.errorCount++;
      throw error;
    } finally {
      await databoxInternal?.close();
    }
  }

  public static run<TOutput>(
    databoxWrapper: DataboxWrapperAbstract<any, any>,
  ): Promise<TOutput | Error> {
    const options = readCommandLineArgs();
    return databoxWrapper.run(options).catch(err => err);
  }

  public static async attemptAutorun(): Promise<void> {
    await attemptAutorun(module.parent, require.main, this);
  }

  protected abstract createDataboxInternal(options: TDataboxRunOptions): TDataboxInternal;
}
