import Databox from '@ulixee/databox';
import IBasicInput from '@ulixee/databox-interfaces/IBasicInput';
import IDataboxExecutable from '@ulixee/databox-interfaces/IDataboxExecutable';
import IComponents, { IRunFn } from '../interfaces/IComponents';
import IDataboxForPuppeteerExecOptions from '../interfaces/IDataboxForPuppeteerExecOptions';
import DataboxForPuppeteerPlugin from './DataboxForPuppeteerPlugin';

export default class DataboxForPuppeteer<TInput = IBasicInput, TOutput = any>
extends Databox<TInput, TOutput, IDataboxForPuppeteerExecOptions> 
implements IDataboxExecutable<TOutput, IDataboxForPuppeteerExecOptions> {
  constructor(components: IRunFn<TInput, TOutput> | IComponents<TInput, TOutput>) {
    super(components);
    this.plugins.add(DataboxForPuppeteerPlugin);
  }
}
