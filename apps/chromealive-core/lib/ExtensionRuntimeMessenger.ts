import { IPuppetPage } from '@ulixee/hero-interfaces/IPuppetPage';
import { Protocol } from '@ulixee/hero-interfaces/IDevtoolsSession';
import { bindFunctions } from '@ulixee/commons/lib/utils';
import ConsoleMessage from '@ulixee/hero-puppet-chrome/lib/ConsoleMessage';
import { extensionId } from '../index';

export default class ExtensionRuntimeMessenger {
  private executionContextId: number;

  constructor(private page: IPuppetPage) {
    bindFunctions(this);
    page.devtoolsSession.on('Runtime.executionContextCreated', this.onContextCreated);
    page.devtoolsSession.on('Runtime.executionContextDestroyed', this.onContextDestroyed);
    page.devtoolsSession.on('Runtime.executionContextsCleared', this.onContextCleared);

    page.on('close', this.close);
    page.browserContext.on('close', this.close);
  }

  public close() {
    this.page = null;
    this.executionContextId = null;
  }

  public async send<T>(message: any): Promise<T> {
    const contextId = this.executionContextId;
    if (!contextId) throw new Error('Extension context not loaded for page');

    const result = await this.page.devtoolsSession.send('Runtime.evaluate', {
      expression: `new Promise((resolve, reject) => chrome.runtime.sendMessage(${JSON.stringify(
        message,
      )}, {}, result => {
        if (result instanceof Error) reject(result);
        else resolve(result);
      }))`,
      contextId,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw ConsoleMessage.exceptionToError(result.exceptionDetails);
    }
    const remote = result.result;
    if (remote.objectId) this.page.devtoolsSession.disposeRemoteObject(remote);
    return remote.value as T;
  }

  private onContextCreated(event: Protocol.Runtime.ExecutionContextCreatedEvent): void {
    const { context } = event;
    if (context.origin === `chrome-extension://${extensionId}`) {
      if (context.auxData?.frameId === this.page?.mainFrame.id) {
        this.executionContextId = context.id;
      }
    }
  }

  private onContextDestroyed(event: Protocol.Runtime.ExecutionContextDestroyedEvent): void {
    const { executionContextId } = event;
    if (this.executionContextId === executionContextId) {
      this.executionContextId = undefined;
    }
  }

  private onContextCleared(): void {
    this.executionContextId = undefined;
  }
}
