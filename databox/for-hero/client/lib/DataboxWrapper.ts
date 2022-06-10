import IDataboxForHeroRunOptions from '../interfaces/IDataboxForHeroRunOptions';
import readCommandLineArgs from './utils/readCommandLineArgs';
import IComponents, { IRunFn } from '../interfaces/IComponents';
import DataboxInternal from './DataboxInternal';
import IBasicInput from '@ulixee/databox-interfaces/IBasicInput';
import IDataboxWrapper from '@ulixee/databox-interfaces/IDataboxWrapper';

export default class DataboxWrapper<TInput = IBasicInput, TOutput = any> implements IDataboxWrapper {
  public static defaultExport: DataboxWrapper;
  public static disableAutorun = !!process.env.ULX_DATABOX_DISABLE_AUTORUN;

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
    
    this.disableAutorun = DataboxWrapper.disableAutorun;
  }

  public async run(options: IDataboxForHeroRunOptions = {}): Promise<TOutput> {
    const databoxInternal = new DataboxInternal<TInput, TOutput>(
      options,
      this.#components.defaults,
    );
    const shouldRunFull = !databoxInternal.sessionIdToExtract;
    try {
      if (shouldRunFull) {
        await databoxInternal.execRunner(this.#components.run);
      }

      if (this.#components.extract) {
        await databoxInternal.execExtractor(this.#components.extract);
      }
    } catch (error) {
      console.error(`ERROR running databox: `, error);
      this.errorCount++;
      throw error;
    } finally {
      await databoxInternal.close();
    }
    
    this.successCount++;
    return databoxInternal.output;
  }

  public static run<T>(databoxWrapper: DataboxWrapper): Promise<T | Error> {
    const options = readCommandLineArgs();
    return databoxWrapper.run(options).catch(err => err);
  }

  public static async attemptAutorun(): Promise<void> {
    let databoxWrapper = DataboxWrapper.defaultExport;
    let parent = module.parent;
    
    while (!databoxWrapper && parent) {
      if (parent === require.main && parent.exports?.default instanceof DataboxWrapper) {
        databoxWrapper = parent.exports?.default;
      } 
      parent = parent.parent;
    }
    if (!databoxWrapper) return;
    if (databoxWrapper.disableAutorun) return;
    if (databoxWrapper.successCount || databoxWrapper.errorCount) return;
    await DataboxWrapper.run(databoxWrapper);    
  }
}

process.on('beforeExit', async () => {
  await DataboxWrapper.attemptAutorun();
  process.exit(0);
});
