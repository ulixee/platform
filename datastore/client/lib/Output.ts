import { inspect } from 'util';
import ObjectObserver from './ObjectObserver';
import IObservableChange from '../interfaces/IObservableChange';

export interface IOutputClass<T> {
  new (data?: T): T & { emit(): void };
  emit(data: T);
}

interface IInternalOutputOptions<TOutput> {
  outputs: TOutput[];
  onOutputEmitted(output: TOutput);
  onOutputChanges(output: TOutput, changes: IObservableChange[]): void;
}

export default function createOutputGenerator<TOutput>(
  internal: IInternalOutputOptions<TOutput>,
): IOutputClass<TOutput> {
  return class Output {
    #observable: ObjectObserver;
    #isEmitted = false;

    constructor(data?: TOutput) {
      this.#observable = new ObjectObserver(data ?? {});
      this.#observable.proxiedFunctions.emit = this.emit.bind(this);
      this.#observable.proxiedFunctions.toJSON = this.toJSON.bind(this);
      this.#observable.onChanges = internal.onOutputChanges.bind(null, this.#observable.target);

      internal.outputs.push(this.#observable.proxy);
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
      internal.onOutputEmitted(this.toJSON());
    }

    static emit(data: TOutput): void {
      new Output(data).emit();
    }
  } as unknown as IOutputClass<TOutput>;
}
