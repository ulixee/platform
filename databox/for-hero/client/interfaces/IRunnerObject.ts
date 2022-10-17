import { RunnerObject as RunnerObjectBase } from "@ulixee/databox";

export default interface IRunnerObject<TInput, TOutput, THero> extends RunnerObjectBase<TInput, TOutput> {
  hero: THero;
  sessionId: Promise<string>;
}