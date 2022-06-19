import IBasicInput from '@ulixee/databox-interfaces/IBasicInput';
import IDataboxWrapper from '@ulixee/databox-interfaces/IDataboxWrapper';
import { setupAutorunBeforeExitHook } from '@ulixee/databox/lib/utils/Autorun';
import DataboxWrapperAbstract from '@ulixee/databox/lib/abstracts/DataboxWrapperAbstract';
import IDataboxForPuppeteerRunOptions from '../interfaces/IDataboxForPuppeteerRunOptions';
import IComponents from '../interfaces/IComponents';
import DataboxInternal from './DataboxInternal';
import RunnerObject from './RunnerObject';

const pkg = require('@ulixee/databox/package.json');

export default class DataboxWrapper<TInput = IBasicInput, TOutput = any>
extends DataboxWrapperAbstract<
  DataboxInternal<TInput, TOutput>,
  TOutput,
  IDataboxForPuppeteerRunOptions<TInput>,
  IComponents<TInput, TOutput>,
  RunnerObject<TInput, TOutput>
> implements IDataboxWrapper {

  public readonly runtimeName = pkg.name;
  public readonly runtimeVersion = pkg.version;

  protected createDataboxInternal(options: IDataboxForPuppeteerRunOptions<TInput>): DataboxInternal<TInput, TOutput> {
    return new DataboxInternal(options, this.components.defaults);
  }
}

setupAutorunBeforeExitHook(DataboxWrapper);
