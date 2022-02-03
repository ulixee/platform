import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import DataboxInternal from './DataboxInternal';
import CollectedElements from './CollectedElements';
import CollectedResources from './CollectedResources';
import CollectedSnippets from './CollectedSnippets';

export default class Extractor extends TypedEventEmitter<{ close: void; error: Error }> {
  readonly #databoxInternal: DataboxInternal;
  readonly #sessionId: Promise<string>;

  constructor(databoxInternal: DataboxInternal) {
    super();
    const { sessionIdToExtract, hero } = databoxInternal;
    this.#databoxInternal = databoxInternal;
    this.#sessionId = sessionIdToExtract ? Promise.resolve(sessionIdToExtract) : hero.sessionId;
  }

  public get collectedElements(): CollectedElements {
    const { hero } = this.#databoxInternal;
    return new CollectedElements(hero.getCollectedElements.bind(hero, this.#sessionId));
  }

  public get collectedSnippets(): CollectedSnippets {
    const { hero } = this.#databoxInternal;
    return new CollectedSnippets(hero.getCollectedSnippets.bind(hero, this.#sessionId));
  }

  public get collectedResources(): CollectedResources {
    const { hero } = this.#databoxInternal;
    return new CollectedResources(hero.getCollectedResources.bind(hero, this.#sessionId));
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
