import { setupAutorunBeforeExitHook } from '@ulixee/databox/lib/utils/Autorun';
import IBasicInput from '@ulixee/databox-interfaces/IBasicInput';
import IDataboxWrapper from '@ulixee/databox-interfaces/IDataboxWrapper';
import DataboxWrapperAbstract from '@ulixee/databox/lib/abstracts/DataboxWrapperAbstract';
import IDataboxForHeroRunOptions from '../interfaces/IDataboxForHeroRunOptions';
import IComponents from '../interfaces/IComponents';
import DataboxInternal from './DataboxInternal';
import RunnerObject from './RunnerObject';

const pkg = require('../package.json');

export default class DataboxWrapper<TInput = IBasicInput, TOutput = any>
extends DataboxWrapperAbstract<
  DataboxInternal<TInput, TOutput>,
  TOutput,
  IDataboxForHeroRunOptions<TInput>,
  IComponents<TInput, TOutput>,
  RunnerObject<TInput, TOutput>
> implements IDataboxWrapper {

  public override readonly runtimeName = pkg.name;
  public override readonly runtimeVersion = pkg.version;
  
  public override async run(options: IDataboxForHeroRunOptions<TInput>): Promise<TOutput> {
    let databoxInternal: DataboxInternal<TInput, TOutput>;
    try {
      databoxInternal = new DataboxInternal(options, this.components.defaults);
      const shouldRunFull = !databoxInternal.sessionIdToExtract;
      if (shouldRunFull) {
        await databoxInternal.execRunner(this.components.run);
      }

      if (this.components.extract) {
        await databoxInternal.execExtractor(this.components.extract);
      }

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

  protected createDataboxInternal(options: IDataboxForHeroRunOptions<TInput>): DataboxInternal<TInput, TOutput> {
    return new DataboxInternal(options, this.components.defaults);
  }
}

setupAutorunBeforeExitHook(DataboxWrapper);
