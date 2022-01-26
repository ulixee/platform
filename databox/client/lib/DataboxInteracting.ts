import IDataboxMeta from '@ulixee/databox-interfaces/IDataboxMeta';
import IDataboxRunOptions from '@ulixee/databox-interfaces/IDataboxRunOptions';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import Hero, { IHeroCreateOptions } from '@ulixee/hero';
import Output, { createObservableOutput } from './Output';
import ConnectionManager from './ConnectionManager';
import DisconnectedFromCoreError from '../connections/DisconnectedFromCoreError';

export default class DataboxInteracting extends TypedEventEmitter<{ close: void; error: Error }> {
  public readonly hero: Hero;

  #output: Output;
  #connectionManager: ConnectionManager;
  #isClosing: Promise<void>;

  beforeClose?: () => Promise<any>;

  readonly queryOptions: IDataboxRunOptions;

  constructor(connectionManager: ConnectionManager, runOptions: IDataboxRunOptions) {
    super();
    this.#connectionManager = connectionManager;
    this.queryOptions = runOptions;

    const heroOptions: IHeroCreateOptions = {};
    for (const [key, value] of Object.entries(runOptions)) {
      heroOptions[key] = value;
    }

    heroOptions.connectionToCore = {
      host: this.host,
    };
    heroOptions.externalIds ??= {};
    heroOptions.externalIds.databoxSessionId = this.sessionId;

    const hero = new Hero(heroOptions);
    this.hero = hero;

    void hero.on('command', (command, commandId) => {
      this.lastExternalId = commandId;
    });

    this.beforeClose = () => hero.close();
    this.on('error', () => hero.close());
  }

  public get host(): Promise<string> {
    return this.#connectionManager.host;
  }

  public set lastExternalId(lastCommandId: number) {
    this.#connectionManager.lastExternalId = lastCommandId;
  }

  public get lastExternalId(): number {
    return this.#connectionManager.lastExternalId;
  }

  public get isClosing(): boolean {
    return !!this.#isClosing;
  }

  public get action(): string {
    return this.queryOptions.action || '/';
  }

  public get input(): { [key: string]: any } {
    const input = this.queryOptions.input || {};
    return { ...input };
  }

  public get output(): any | any[] {
    if (!this.#output) {
      const coreSession = this.#connectionManager
        .getConnectedCoreSessionOrReject()
        .catch(() => null);
      this.#output = createObservableOutput(coreSession);
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

  public get meta(): Promise<IDataboxMeta> {
    const coreSession = this.#connectionManager.getConnectedCoreSessionOrReject();
    return coreSession.then(x => x.getDataboxMeta());
  }

  public get sessionId(): Promise<string> {
    const coreSession = this.#connectionManager.getConnectedCoreSessionOrReject();
    return coreSession.then(x => x.sessionId);
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
        await this.#connectionManager.close();
        resolve();
      } catch (error) {
        if (error instanceof DisconnectedFromCoreError) return resolve();
        reject(error);
      }
    });
    return this.#isClosing;
  }
}
