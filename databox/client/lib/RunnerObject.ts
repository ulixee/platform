import IBasicInput from '@ulixee/databox-interfaces/IBasicInput';
import RunnerObjectAbstract from './abstracts/RunnerObjectAbstract';

export default class RunnerObject<TInput extends IBasicInput, TOutput> extends RunnerObjectAbstract<TInput, TOutput> {}
