import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import DataboxInternal from './DataboxInternal';

export default class Runner<TInput, TOutput> extends TypedEventEmitter<{ close: void; error: Error }> {
  #databoxInternal: DataboxInternal<TInput, TOutput>;

  constructor(databoxInternal: DataboxInternal<TInput, TOutput>) {
    super();
    this.#databoxInternal = databoxInternal;
  }

  public get action(): DataboxInternal<TInput, TOutput>['action'] {
    return this.#databoxInternal.action;
  }

  public get input(): TInput {
    return this.#databoxInternal.input as TInput;
  }

  public get output(): TOutput {
    return this.#databoxInternal.output;
  }

  public set output(value: any | any[]) {
    this.#databoxInternal.output = value;
  }

  public get schema(): DataboxInternal<TInput, TOutput>['schema'] {
    return this.#databoxInternal.schema;
  }
}
