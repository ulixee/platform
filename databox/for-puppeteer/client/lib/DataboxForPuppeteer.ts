import IBasicInput from '@ulixee/databox-interfaces/IBasicInput';
import IDataboxExecutable from '@ulixee/databox-interfaces/IDataboxExecutable';
import IComponentsBase, { IRunFnBase } from '@ulixee/databox/interfaces/IComponentsBase';
import Databox from '@ulixee/databox';
import IDataboxForPuppeteerExecOptions from '../interfaces/IDataboxForPuppeteerExecOptions';
import DataboxForPuppeteerPlugin from './DataboxForPuppeteerPlugin';

export default class DataboxForPuppeteer<TInput = IBasicInput, TOutput = any>
extends Databox<TInput, TOutput, IDataboxForPuppeteerExecOptions> 
implements IDataboxExecutable<TOutput, IDataboxForPuppeteerExecOptions> {
  constructor(components: IRunFnBase<any> | IComponentsBase<any, any>) {
    super(components);
    this.plugins.add(DataboxForPuppeteerPlugin);
  }
}
