import IBasicInput from '@ulixee/databox-interfaces/IBasicInput';
import IDataboxExecutable from '@ulixee/databox-interfaces/IDataboxExecutable';
import { IRunFnBase } from '@ulixee/databox/interfaces/IComponentsBase';
import DataboxExecutable from '@ulixee/databox/lib/DataboxExecutable';
import DataboxForHeroPlugin from './DataboxForHeroPlugin';
import IComponents from '../interfaces/IComponents';
import IDataboxForHeroExecOptions from '../interfaces/IDataboxForHeroExecOptions';

export default class DataboxForHero<TInput = IBasicInput, TOutput = any>
extends DataboxExecutable<TInput, TOutput, IDataboxForHeroExecOptions<TInput>> 
implements IDataboxExecutable<TOutput, IDataboxForHeroExecOptions> {
  constructor(components: IRunFnBase<any> | IComponents<TInput, TOutput>) {
    super(components);
    this.plugins.add(DataboxForHeroPlugin);
  }
}
