import IDataboxRunOptions from '@ulixee/databox-interfaces/IDataboxRunOptions';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import Hero, { IHeroCreateOptions } from '@ulixee/hero';
import ICoreSession from '@ulixee/hero/interfaces/ICoreSession';
import { InternalPropertiesSymbol } from '@ulixee/hero/lib/InternalProperties';
import Output, { createObservableOutput } from './Output';
import './DomExtender';
import './ResourceExtender';
import Runner from './Runner';
import Extractor from './Extractor';
import {
  IExtractElementFn,
  IExtractElementsFn,
  IExtractFn,
  IRunFn,
} from '../interfaces/IComponents';

const databoxInternalByCoreSession: WeakMap<ICoreSession, DataboxInternal> = new WeakMap();

export default class DataboxInternal extends TypedEventEmitter<{ close: void; error: Error }> {
  public hero: Hero;
  readonly runOptions: IDataboxRunOptions;
  beforeClose?: () => Promise<any>;

  #output: Output;
  #isClosing: Promise<void>;
  #extractorPromises: Promise<any>[] = [];

  constructor(runOptions: IDataboxRunOptions) {
    super();
    this.runOptions = runOptions;
    this.initializeHero();
    this.coreSessionPromise
      .then(coreSession => databoxInternalByCoreSession.set(coreSession, this))
      .catch(() => null);

    this.beforeClose = () => this.hero.close();
    this.on('error', () => this.hero.close());
  }

  public get coreSessionPromise(): Promise<ICoreSession> {
    return this.hero[InternalPropertiesSymbol].coreSessionPromise;
  }

  public get sessionIdToExtract(): string | undefined {
    return (this.runOptions as any).extractSessionId ?? process.env.HERO_EXTRACT_SESSION_ID;
  }

  public get isClosing(): boolean {
    return !!this.#isClosing;
  }

  public get action(): string {
    return this.runOptions.action || '/';
  }

  public get input(): { [key: string]: any } {
    const input = this.runOptions.input || {};
    return { ...input };
  }

  public get output(): any | any[] {
    if (!this.#output) {
      this.#output = createObservableOutput(this.coreSessionPromise);
    }
    return this.#output;
  }

  public set output(value: any | any[]) {
    const output = this.output;
    for (const key of Object.keys(output)) {
      delete output[key];
    }
    Object.assign(this.output, value);
  }

  public get sessionId(): Promise<string> {
    return this.hero.sessionId;
  }

  public get schema(): { [key: string]: any } {
    return {};
  }

  public async execRunner(runFn: IRunFn) {
    const runner = new Runner(this);
    await runFn(runner);
  }

  public execExtractor<T>(
    extractFn: IExtractFn | IExtractElementFn<T> | IExtractElementsFn<T>,
    element?: Element | Element[],
  ) {
    const extractor = new Extractor(this);
    let response: any;
    if (Array.isArray(element)) {
      response = (extractFn as IExtractElementsFn<T>)(element as Element[], extractor);
    } else if (element) {
      response = (extractFn as IExtractElementFn<T>)(element as Element, extractor);
    } else {
      response = (extractFn as IExtractFn)(extractor);
    }
    this.#extractorPromises.push(response);
    return response;
  }

  public close(): Promise<void> {
    if (this.#isClosing) return this.#isClosing;
    this.emit('close');
    this.#isClosing = new Promise(async (resolve, reject) => {
      try {
        await Promise.all(this.#extractorPromises);
        if (this.beforeClose) await this.beforeClose();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
    return this.#isClosing;
  }

  protected initializeHero(): void {
    const heroOptions: IHeroCreateOptions = {};
    for (const [key, value] of Object.entries(this.runOptions)) {
      heroOptions[key] = value;
    }
    this.hero = new Hero(heroOptions);
  }
}

export function getDataboxInternalByCoreSession(coreSession: ICoreSession): DataboxInternal {
  return databoxInternalByCoreSession.get(coreSession);
}
