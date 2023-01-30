import IRunnerExecOptions from './IRunnerExecOptions';
import IRunnerSchema from './IRunnerSchema';
import IRunnerContext from './IRunnerContext';
import RunnerInternal from '../lib/RunnerInternal';

export default interface IRunnerPlugin<
  ISchema extends IRunnerSchema,
  IOptions extends IRunnerExecOptions<ISchema> = IRunnerExecOptions<ISchema>,
  IContext extends IRunnerContext<ISchema> = IRunnerContext<ISchema>,
> {
  name: string;
  version: string;
  run(
    runnerInternal: RunnerInternal<ISchema, IOptions>,
    context: IContext,
    next: () => Promise<IRunnerContext<ISchema>['outputs']>,
  ): Promise<void>;
}
