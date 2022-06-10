import IDataboxRunOptions from '@ulixee/databox-interfaces/IDataboxRunOptions';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import { IDefaultsObj, IRunFn } from '../interfaces/IComponents';
import Runner from './Runner';

export default class DataboxInternal<TInput, TOutput> extends TypedEventEmitter<{
  close: void;
}> {
  readonly runOptions: IDataboxRunOptions;

  readonly #input: TInput;
  #output: TOutput;
  #isClosing: Promise<void>;
  #extractorPromises: Promise<any>[] = [];
  #defaults: IDefaultsObj<TInput, TOutput>;

  constructor(runOptions: IDataboxRunOptions, defaults?: IDefaultsObj<TInput, TOutput>) {
    super();
    this.runOptions = runOptions;
    this.#defaults = defaults || {};
    this.#input = this.#defaults.input as TInput;
    this.#input ??= {} as TInput;
    if (runOptions.input) {
      Object.assign(this.#input, runOptions.input);
    }
  }

  public get isClosing(): boolean {
    return !!this.#isClosing;
  }

  public get action(): string {
    return this.runOptions.action || '/';
  }

  public get input(): TInput {
    return { ...this.#input };
  }

  public get output(): TOutput {
    return this.#output as unknown as TOutput;
  }

  public set output(value: any | any[]) {
    this.#output = value;
  }

  public get schema(): { [key: string]: any } {
    return {};
  }

  public async execRunner(runFn: IRunFn<TInput, TOutput>): Promise<void> {
    const runner = new Runner<TInput, TOutput>(this);
    await runFn(runner);
  }

  public close(): Promise<void> {
    if (this.#isClosing) return this.#isClosing;
    this.emit('close');
    this.#isClosing = new Promise(async (resolve, reject) => {
      try {
        await Promise.all(this.#extractorPromises).catch(err => err);
        
        resolve();
      } catch (error) {
        reject(error);
      }
    });
    return this.#isClosing;
  }
}
