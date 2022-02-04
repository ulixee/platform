import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import DataboxInternal from './DataboxInternal';
import CollectedElements from './CollectedElements';
import CollectedResources from './CollectedResources';
import CollectedSnippets from './CollectedSnippets';

export default class Extractor extends TypedEventEmitter<{ close: void; error: Error }> {
  readonly #databoxInternal: DataboxInternal;
  readonly #sessionIdPromise: Promise<string>;

  constructor(databoxInternal: DataboxInternal) {
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

  public get action(): DataboxInternal['action'] {
    return this.#databoxInternal.action;
  }

  public get input(): DataboxInternal['input'] {
    return this.#databoxInternal.input;
  }

  public get output(): DataboxInternal['output'] {
    return this.#databoxInternal.output;
  }

  public set output(value: any | any[]) {
    this.#databoxInternal.output = value;
  }

  public get sessionId(): DataboxInternal['sessionId'] {
    return this.#databoxInternal.sessionId;
  }

  public get schema(): DataboxInternal['schema'] {
    return this.#databoxInternal.schema;
  }
}
