import IDataboxRunOptions from '@ulixee/databox-interfaces/IDataboxRunOptions';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import IBasicInput from '@ulixee/databox-interfaces/IBasicInput';
import { IRunFnBase, IDefaultsObjBase } from '../../interfaces/IComponentsBase';
import RunnerObjectAbstract from './RunnerObjectAbstract';
import ISchema from '../../interfaces/ISchema';

export default abstract class DataboxInternalAbstract<
  TRunnerObject extends RunnerObjectAbstract<any, any>,
  TDefaultsObject extends IDefaultsObjBase<any, any>,
  TInput = IBasicInput,
  TOutput = any,
  TDataboxRunOptions extends IDataboxRunOptions = IDataboxRunOptions,
  > extends TypedEventEmitter<{
  close: void;
}> {
  #isClosing: Promise<void>;

  readonly runOptions: TDataboxRunOptions;
  readonly defaults: TDefaultsObject;

  protected readonly _input: TInput;
  protected _output: TOutput;

  constructor(runOptions: TDataboxRunOptions, defaults?: TDefaultsObject) {
    super();
    this.runOptions = runOptions;
    this.defaults = defaults || {} as TDefaultsObject;
    this._input = (this.defaults as any).input as TInput;
    this._input ??= {} as TInput;
    if (runOptions.input) {
      if (typeof runOptions.input === 'object') {
        Object.assign(this._input, runOptions.input);
      } else {
        this._input = runOptions.input;
      }
    }
  }

  public get isClosing(): boolean {
    return !!this.#isClosing;
  }

  public get action(): string {
    return this.runOptions.action || '/';
  }

  public get input(): TInput {
    if (this._input && typeof this._input === 'object') {
      return { ...this._input };
    }
    return this._input;
  }

  public get output(): TOutput {
    return this._output as unknown as TOutput;
  }

  public set output(value: any | any[]) {
    this._output = value;
  }

  public get schema(): ISchema {
    return {};
  }

  public async execRunner(runFn: IRunFnBase<TRunnerObject>): Promise<void> {
    try {
      const runnerObject = this.createRunnerObject();
      await runFn(runnerObject);
    } catch (error) {
      if (error.stack.includes('at async DataboxInternal.execRunner')) {
        error.stack = error.stack.split('at async DataboxInternal.execRunner').shift().trim();
      }
      throw error;
    }
  }

  public close(closeFn?: () => Promise<void>): Promise<void> {
    if (this.#isClosing) return this.#isClosing;
    this.emit('close');
    this.#isClosing = new Promise(async (resolve, reject) => {
      try {
        if (closeFn) await closeFn();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
    return this.#isClosing;
  }

  protected abstract createRunnerObject(): TRunnerObject;
}
