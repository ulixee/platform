import IDataboxForHeroRunOptions from '../interfaces/IDataboxForHeroRunOptions';
import readCommandLineArgs from './utils/readCommandLineArgs';
import IComponents, { IRunFn } from '../interfaces/IComponents';
import DataboxInternal from './DataboxInternal';
import IBasicInput from '@ulixee/databox-interfaces/IBasicInput';
import IDataboxWrapper from '@ulixee/databox-interfaces/IDataboxWrapper';

export default class DataboxWrapper<TInput = IBasicInput, TOutput = any>
  implements IDataboxWrapper
{
  public static runLater = !!process.env.ULX_DATABOX_RUN_LATER;

  public autoRunPromise: Promise<TOutput | Error>;
  #components: IComponents<TInput, TOutput>;

  constructor(components: IRunFn<TInput, TOutput> | IComponents<TInput, TOutput>) {
    this.#components =
      typeof components === 'function'
        ? {
            run: components,
          }
        : { ...components };

    if (!DataboxWrapper.runLater) {
      this.autoRunPromise = DataboxWrapper.autoRun(this);
    }
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
      throw error;
    } finally {
      await databoxInternal.close();
    }

    return databoxInternal.output;
  }

  public static autoRun<T>(databoxWrapper: DataboxWrapper): Promise<T | Error> {
    const options = readCommandLineArgs();
    return databoxWrapper.run(options).catch(err => err);
  }
}
