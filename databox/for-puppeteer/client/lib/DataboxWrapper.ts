import readCommandLineArgs from '@ulixee/databox/lib/utils/readCommandLineArgs';
import IBasicInput from '@ulixee/databox-interfaces/IBasicInput';
import IDataboxWrapper from '@ulixee/databox-interfaces/IDataboxWrapper';
import { setupAutorunBeforeExitHook, attemptAutorun } from '@ulixee/databox/lib/utils/Autorun';
import IDataboxForPuppeteerRunOptions from '../interfaces/IDataboxForPuppeteerRunOptions';
import IComponents, { IRunFn } from '../interfaces/IComponents';
import DataboxInternal from './DataboxInternal';

export default class DataboxWrapper<TInput = IBasicInput, TOutput = any>
  implements IDataboxWrapper
{
  public static defaultExport: DataboxWrapper;

  public readonly module = '@ulixee/databox-for-puppeteer';
  public disableAutorun: boolean;
  public successCount = 0;
  public errorCount = 0;

  #components: IComponents<TInput, TOutput>;

  constructor(components: IRunFn<TInput, TOutput> | IComponents<TInput, TOutput>) {
    this.#components =
      typeof components === 'function'
        ? {
            run: components,
          }
        : { ...components };

    this.disableAutorun = !!process.env.ULX_DATABOX_DISABLE_AUTORUN;
  }

  public async run(options: IDataboxForPuppeteerRunOptions = {}): Promise<TOutput> {
    let databoxInternal: DataboxInternal<TInput, TOutput>;

    try {
      databoxInternal = new DataboxInternal(options, this.#components.defaults);
      await databoxInternal.execRunner(this.#components.run);

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

  public static run<T>(databoxWrapper: DataboxWrapper): Promise<T | Error> {
    const options = readCommandLineArgs();
    return databoxWrapper.run(options).catch(err => err);
  }

  public static async attemptAutorun(): Promise<void> {
    await attemptAutorun(module.parent, require.main, DataboxWrapper);
  }
}

setupAutorunBeforeExitHook(DataboxWrapper);
