import '@ulixee/commons/lib/SourceMapSupport';
import * as Path from 'path';
import { nanoid } from 'nanoid';
import IResolvablePromise from '@ulixee/commons/interfaces/IResolvablePromise';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import { createPromise } from '@ulixee/commons/lib/utils';
import { ChildProcess, fork } from 'child_process';
import ResultIterable from '@ulixee/datastore/lib/ResultIterable';
import TypeSerializer from '@ulixee/commons/lib/TypeSerializer';
import {
  IExecResponseData,
  IFetchMetaMessage,
  IFetchMetaResponseData,
  IResponse,
  IRunMessage,
} from '../interfaces/ILocalDatastoreProcess';

const datastoreProcessJsPath = require.resolve('../bin/datastore-process.js');

let streamIdCounter = 0;

export default class LocalDatastoreProcess extends TypedEventEmitter<{ error: Error }> {
  public scriptPath: string;

  #isSpawned = false;
  #child: ChildProcess;
  #pendingById: { [id: string]: IResolvablePromise<any> } = {};
  #streamsById: { [id: string]: (record: any) => void } = {};

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

  public run(runnerName: string, input: any): ResultIterable<any> {
    const iterable = new ResultIterable();
    streamIdCounter += 1;
    const streamId = streamIdCounter;
    this.#streamsById[streamId] = iterable.push.bind(iterable);
    void (async () => {
      const data = await this.sendMessageToChild<IRunMessage, IExecResponseData>({
        action: 'run',
        scriptPath: this.scriptPath,
        runnerName,
        input,
        streamId,
      });
      if (data instanceof Error) {
        throw data;
      }
      iterable.done();
    })()
      .catch(iterable.reject)
      .finally(() => {
        delete this.#streamsById[streamId];
      });
    return iterable;
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

    this.#child.on('message', x => this.handleMessageFromChild(x as string));
    this.#child.on('error', error => {
      console.error('ERROR in LocalDatastoreProcess', error);
      this.emit('error', error);
    });
    this.#child.on('spawn', () => (this.#isSpawned = true));
    this.#child.on('exit', () => this.closeCleanup());

    return this.#child;
  }

  private handleMessageFromChild(responseJson: string): void {
    const response: IResponse = TypeSerializer.parse(responseJson);
    if (response.streamId) {
      this.#streamsById[response.streamId]?.(response.data);
      return;
    }

    const promise = this.#pendingById[response.responseId];
    if (!promise) return;

    if (response.data instanceof Error) promise.reject(response.data);
    else promise.resolve(response.data);
    delete this.#pendingById[response.responseId];
  }

  private sendMessageToChild<TMessage, TResponse>(
    message: Omit<TMessage, 'messageId'>,
  ): Promise<TResponse> {
    const promise = createPromise<TResponse>();
    const messageId = nanoid();
    this.#pendingById[messageId] = promise;
    this.child.send(TypeSerializer.stringify({ ...message, messageId }));
    return promise.promise;
  }
}
