import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import DataboxInternal from './DataboxInternal';
import CollectedElements from './CollectedElements';
import CollectedResources from './CollectedResources';
import CollectedSnippets from './CollectedSnippets';

export default class Extractor<TInput, TOutput> extends TypedEventEmitter<{ close: void; error: Error }> {
  readonly #databoxInternal: DataboxInternal<TInput, TOutput>;
  readonly #sessionIdPromise: Promise<string>;

  constructor(databoxInternal: DataboxInternal<TInput, TOutput>) {
    super();
    const { sessionIdToExtract, hero } = databoxInternal;
    this.#databoxInternal = databoxInternal;
    this.#sessionIdPromise = sessionIdToExtract ? Promise.resolve(sessionIdToExtract) : hero.sessionId;
  }

  public get collectedElements(): CollectedElements {
    return new CollectedElements(this.#databoxInternal.coreSessionPromise, this.#sessionIdPromise);
  }

  public get collectedSnippets(): CollectedSnippets {
    return new CollectedSnippets(this.#databoxInternal.coreSessionPromise, this.#sessionIdPromise);
  }

  public get collectedResources(): CollectedResources {
    return new CollectedResources(this.#databoxInternal.coreSessionPromise, this.#sessionIdPromise);
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
