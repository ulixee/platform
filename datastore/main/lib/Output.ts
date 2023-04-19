import { inspect } from 'util';
import ObjectObserver from './ObjectObserver';
import IObservableChange from '../interfaces/IObservableChange';

export interface IOutputClass<T> {
  new (data?: T): T & { emit(): void };
  emit(data: T): void;
  Type: T & { emit(): void };
}

interface IInternalOutputOptions<TOutput> {
  outputs: TOutput[];
  onNewOutput(index: number);
  onOutputEmitted(index: number, output: TOutput);
  onOutputChanges(index: number, output: TOutput, changes: IObservableChange[]): void;
}

export default function createOutputGenerator<TOutput>(
  internal: IInternalOutputOptions<TOutput>,
): IOutputClass<TOutput> {
  return class Output {
    #observable: ObjectObserver;
    #isEmitted = false;
    #index: number;

    constructor(data?: TOutput) {
      this.#index = internal.outputs.length;
      this.#observable = new ObjectObserver(data ?? {});
      this.#observable.proxiedFunctions.emit = this.emit.bind(this);
      this.#observable.proxiedFunctions.toJSON = this.toJSON.bind(this);
      this.#observable.onChanges = internal.onOutputChanges.bind(
        null,
        this.#index,
        this.#observable.target,
      );

      internal.outputs.push(this.#observable.proxy);
      internal.onNewOutput(this.#index);
      if (data && Object.keys(data).length) {
        process.nextTick(this.#observable.emitTarget.bind(this.#observable));
      }
      // eslint-disable-next-line no-constructor-return
      return this.#observable.proxy;
    }

    toJSON(): TOutput {
      const target = this.#observable.target;
      const result: any = {};
      if (!target) return result;

      for (const [key, value] of Object.entries(target)) {
        result[key] = value;
      }
      return result;
    }

    [inspect.custom](): TOutput {
      return this.toJSON();
    }

    emit(): void {
      if (this.#isEmitted) return;
      this.#isEmitted = true;
      const target = this.#observable.target;
      Object.freeze(target);
      internal.onOutputEmitted(this.#index, this.toJSON());
    }

    static emit(data: TOutput): void {
      new Output(data).emit();
    }
  } as unknown as IOutputClass<TOutput>;
}
