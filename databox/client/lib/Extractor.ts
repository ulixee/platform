import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import DataboxInternal from './DataboxInternal';
import CollectedFragments from './CollectedFragments';
import CollectedResources from './CollectedResources';

export default class Extractor extends TypedEventEmitter<{ close: void; error: Error }> {
  readonly #databoxInternal: DataboxInternal;
  readonly #sessionId: Promise<string>;

  constructor(databoxInternal: DataboxInternal) {
    super();
    const { sessionIdToExtract, hero } = databoxInternal
    this.#databoxInternal = databoxInternal;
    this.#sessionId = sessionIdToExtract ? Promise.resolve(sessionIdToExtract) : hero.sessionId;
  }

  public get collectedFragments(): CollectedFragments {
    const { hero } = this.#databoxInternal;
    return new CollectedFragments(
      hero.getCollectedFragments.bind(hero, this.#sessionId),
    )
  }

  public get collectedResources(): CollectedResources {
    const { hero } = this.#databoxInternal;
    return new CollectedResources(
      hero.getCollectedResources.bind(hero, this.#sessionId),
    );
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
