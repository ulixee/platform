import IBasicInput from '@ulixee/databox-interfaces/IBasicInput';
import IDataboxRunOptions from '@ulixee/databox-interfaces/IDataboxRunOptions';
import DataboxInternal from './DataboxInternal';
import { setupAutorunBeforeExitHook } from './utils/Autorun';
import DataboxWrapperAbstract from './abstracts/DataboxWrapperAbstract';

const pkg = require('../package.json');

export default class DataboxWrapper<
    TInput = IBasicInput,
    TOutput = any,
  >
  extends DataboxWrapperAbstract<
    DataboxInternal<TInput, TOutput>,
    TOutput,
    IDataboxRunOptions
  >
{
  public readonly runtimeName = pkg.name;
  public readonly runtimeVersion = pkg.version;

  protected createDataboxInternal(options: IDataboxRunOptions<any>): DataboxInternal<TInput, TOutput> {
    return new DataboxInternal(options, this.components.defaults);
  }
}

setupAutorunBeforeExitHook(DataboxWrapper);
