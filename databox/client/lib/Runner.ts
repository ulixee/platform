import Hero from '@ulixee/hero';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import DataboxInternal from './DataboxInternal';

export default class Runner<TInput, TOutput> extends TypedEventEmitter<{ close: void; error: Error }> {
  #databoxInternal: DataboxInternal<TInput, TOutput>;

  constructor(databoxActive: DataboxInternal<TInput, TOutput>) {
    super();
    this.#databoxInternal = databoxActive;
    this.extractLater = this.extractLater.bind(this);
  }

  public async extractLater(name: string, value: any): Promise<void> {
    const coreSession = await this.#databoxInternal.coreSessionPromise;
    await coreSession.collectSnippet(name, value);
  }

  public get hero(): Hero {
    return this.#databoxInternal.hero;
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

  public get sessionId(): DataboxInternal<TInput, TOutput>['sessionId'] {
    return this.#databoxInternal.sessionId;
  }

  public get schema(): DataboxInternal<TInput, TOutput>['schema'] {
    return this.#databoxInternal.schema;
  }
}
