import '@ulixee/commons/lib/SourceMapSupport';
import * as Path from 'path';
import IResolvablePromise from '@ulixee/commons/interfaces/IResolvablePromise';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import { createPromise } from '@ulixee/commons/lib/utils';
import { ChildProcess, fork } from 'child_process';
import TypeSerializer from '@ulixee/commons/lib/TypeSerializer';
import {
  IFetchMetaMessage,
  IFetchMetaResponseData,
  IResponse,
} from '../interfaces/ILocalDatastoreProcess';

const datastoreProcessJsPath = require.resolve('../bin/datastore-process.js');

export default class LocalDatastoreProcess extends TypedEventEmitter<{ error: Error }> {
  public scriptPath: string;

  #isSpawned = false;
  #child: ChildProcess;
  #pendingMessage: IResolvablePromise<any>;

  constructor(scriptPath: string) {
    super();
    this.scriptPath = scriptPath;
  }

  public async fetchMeta(): Promise<IFetchMetaResponseData> {
    return await this.sendMessageToChild<IFetchMetaMessage, IFetchMetaResponseData>({
      action: 'fetchMeta',
      scriptPath: this.scriptPath,
    });
  }

  public close(): Promise<void> {
    const promise = createPromise<void>();
    if (!this.#child) {
      promise.resolve();
      return;
    }
    this.#child.once('exit', () => promise.resolve());
    this.#child.kill('SIGKILL');
    this.closeCleanup();
    return promise.promise;
  }

  private closeCleanup(): void {
    this.#child = undefined;
  }

  private get child(): ChildProcess {
    if (this.#child) return this.#child;

    const execArgv = [];
    const scriptDir = Path.dirname(this.scriptPath);
    const scriptIsTsFile = this.scriptPath.endsWith('.ts');
    if (scriptIsTsFile) {
      execArgv.push('-r', 'ts-node/register');
    }

    this.#child = fork(datastoreProcessJsPath, [], {
      execArgv,
      cwd: scriptDir,
      stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
      env: { ...process.env, ULX_CLI_NOPROMPT: 'true' },
    });

    this.#child.once('message', x => this.handleMessageFromChild(x as string));
    this.#child.once('error', error => {
      console.error('ERROR in LocalDatastoreProcess', error);
      this.emit('error', error);
    });
    this.#child.once('spawn', () => (this.#isSpawned = true));
    this.#child.once('exit', () => this.closeCleanup());

    return this.#child;
  }

  private handleMessageFromChild(responseJson: string): void {
    const response: IResponse = TypeSerializer.parse(responseJson);

    const promise = this.#pendingMessage;
    if (!promise) return;

    if (response.data instanceof Error) promise.reject(response.data);
    else promise.resolve(response.data);
    this.#pendingMessage = null;
  }

  private sendMessageToChild<TMessage, TResponse>(
    message: Omit<TMessage, 'messageId'>,
  ): Promise<TResponse> {
    const promise = createPromise<TResponse>();
    this.#pendingMessage = promise;
    this.child.send(TypeSerializer.stringify(message));
    return promise.promise;
  }
}
