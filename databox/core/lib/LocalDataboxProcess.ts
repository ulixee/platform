import '@ulixee/commons/lib/SourceMapSupport';
import * as Path from 'path';
import { nanoid } from 'nanoid';
import IResolvablePromise from '@ulixee/commons/interfaces/IResolvablePromise';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import { createPromise } from '@ulixee/commons/lib/utils';
import { ChildProcess, fork } from 'child_process';
import { IFetchModuleMessage, IRunMessage, IResponse, IFetchRuntimeResponseData, IRunResponseData } from '../interfaces/ILocalDataboxProcess';

const databoxProcessJsPath = require.resolve('../bin/databox-process.js');

export default class LocalDataboxProcess extends TypedEventEmitter<{ error: Error }> { 
  public scriptPath: string;
  
  #isSpawned = false;
  #child: ChildProcess;
  #pendingById: { [id: string]: IResolvablePromise<any> } = {};

  constructor(scriptPath: string) {
    super();
    this.scriptPath = scriptPath;
  }

  public async fetchRuntime(): Promise<{ name: string, version: string }> {
    const data = await this.sendMessageToChild<IFetchModuleMessage, IFetchRuntimeResponseData>({ 
      action: 'fetchRuntime', 
      scriptPath: this.scriptPath,
    });
    return {
      name: data.name,
      version: data.version,
    };
  }

  public async run(input: any): Promise<any> {
    const data = await this.sendMessageToChild<IRunMessage, IRunResponseData>({ 
      action: 'run', 
      scriptPath: this.scriptPath,
      input,
    });
    return data.output;
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

    this.#child = fork(databoxProcessJsPath, [], {
      execArgv,
      cwd: scriptDir,
      stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
      env: { ...process.env, ULX_CLI_NOPROMPT: 'true' },
    });

    this.#child.on('message', (x) => this.handleMessageFromChild(x as IResponse));
    this.#child.on('error', error => {
      // eslint-disable-next-line no-console
      console.log('ERROR in LocalDataboxProcess', error);
      this.emit('error', error)
    });
    this.#child.on('spawn', () => this.#isSpawned = true);
    this.#child.on('exit', () => this.closeCleanup());

    return this.#child;
  } 

  private handleMessageFromChild(response: IResponse): void {
    const promise = this.#pendingById[response.responseId];
    if (!promise) return;
    promise.resolve(response.data);
  }

  private sendMessageToChild<TMessage, TResponse>(message: Omit<TMessage, 'messageId'>): Promise<TResponse> {
    const promise = createPromise<TResponse>();
    const messageId = nanoid();
    this.#pendingById[messageId] = promise;
    this.child.send({ ...message, messageId });
    return promise.promise;
  }
}
