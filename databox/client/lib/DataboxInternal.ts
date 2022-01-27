import IDataboxRunOptions from '@ulixee/databox-interfaces/IDataboxRunOptions';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import Hero, { IHeroCreateOptions } from '@ulixee/hero';
import Output, { createObservableOutput } from './Output';

export default class DataboxInternal extends TypedEventEmitter<{ close: void; error: Error }> {
  public hero: Hero;
  readonly runOptions: IDataboxRunOptions;
  beforeClose?: () => Promise<any>;

  #output: Output;
  #isClosing: Promise<void>;

  constructor(runOptions: IDataboxRunOptions) {
    super();
    this.runOptions = runOptions;
    this.initializeHero();

    this.beforeClose = () => this.hero.close();
    this.on('error', () => this.hero.close());
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
      this.#output = createObservableOutput(this.hero);
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

  public close(): Promise<void> {
    if (this.#isClosing) return this.#isClosing;
    this.emit('close');
    this.#isClosing = new Promise(async (resolve, reject) => {
      try {
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
