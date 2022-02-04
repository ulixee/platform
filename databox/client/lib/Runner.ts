import Hero from '@ulixee/hero';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import DataboxInternal from './DataboxInternal';

export default class Runner extends TypedEventEmitter<{ close: void; error: Error }> {
  #databoxInternal: DataboxInternal;

  constructor(databoxActive: DataboxInternal) {
    super();
    this.#databoxInternal = databoxActive;
  }

  public async extractLater(name: string, value: any): Promise<void> {
    const coreSession = await this.#databoxInternal.coreSessionPromise;
    await coreSession.collectSnippet(name, value);
  }

  public get hero(): Hero {
    return this.#databoxInternal.hero;
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
