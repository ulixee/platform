import { EventEmitter } from 'events';
import IDevtoolsSession, { Protocol } from '@ulixee/hero-interfaces/IDevtoolsSession';
import { IPuppetPage } from '@ulixee/hero-interfaces/IPuppetPage';
import { CanceledPromiseError } from '@ulixee/commons/interfaces/IPendingWaitEvent';
import { createPromise } from '@ulixee/commons/lib/utils';
import IResolvablePromise from '@ulixee/commons/interfaces/IResolvablePromise';
import { extensionId } from '../ExtensionUtils'
import ChromeAliveCore from '../../index';
import {
  ___receiveFromCore,
  ___sendToCore,
  extractStringifiedComponentsFromMessage,
  extractResponseIdFromMessage,
  messageExpectsResponse, isResponseMessage,
} from '../BridgeHelpers';

export default class BridgeToExtension extends EventEmitter {
  private pageMap: Map<string, { contextIds: Set<number>; puppetPage: IPuppetPage }> = new Map();
  private pendingByResponseId: { [id: string]: IResolvablePromise<any> } = {};

  public addPuppetPage(page: IPuppetPage) {
    this.pageMap.set(page.id, { contextIds: new Set(), puppetPage: page });
    const { devtoolsSession } = page;

    page.on('close', () => this.closePuppetPage(page));
    page.browserContext.on('close', () => this.closePuppetPage(page));

    devtoolsSession.on('Runtime.executionContextCreated', event =>
      this.onContextCreated(page, event),
    );
    devtoolsSession.on('Runtime.executionContextDestroyed', event =>
      this.onContextDestroyed(page, event),
    );
    devtoolsSession.on('Runtime.executionContextsCleared', () => this.onContextCleared(page));

    devtoolsSession.on('Runtime.bindingCalled', event =>
      this.handleIncomingMessageFromBrowser(event),
    );

    return Promise.all([
      devtoolsSession.send('Runtime.enable'),
      devtoolsSession.send('Runtime.addBinding', { name: ___sendToCore }),
      devtoolsSession.send('Runtime.runIfWaitingForDebugger'),
    ]).catch(() => null);
  }

  public send<T = any>(message: any, puppetPageId?: string): Promise<T | void> {
    const [destLocation, responseCode, restOfMessage] =
      extractStringifiedComponentsFromMessage(message);
    puppetPageId ??= ChromeAliveCore.getActivePuppetPage()?.id;
    if (!puppetPageId) {
      throw new Error(`No active puppet page ${puppetPageId}`);
    }
    const { contextIds, puppetPage } = this.pageMap.get(puppetPageId);
    const contextId = contextIds[0];
    this.runInBrowser(
      puppetPage.devtoolsSession,
      contextId,
      `window.${___receiveFromCore}('${destLocation}', '${responseCode}', ${restOfMessage});`,
    );

    if (messageExpectsResponse(message)) {
      const responseId = extractResponseIdFromMessage(message);
      this.pendingByResponseId[responseId] = createPromise<T>(
        10e3,
        'Response was not received within 10s',
      );
      return this.pendingByResponseId[responseId].promise;
    }

    return Promise.resolve();
  }

  public closePuppetPage(page: IPuppetPage) {
    this.pageMap.delete(page.id);
  }

  public close() {
    for (const { puppetPage } of this.pageMap.values()) {
      this.closePuppetPage(puppetPage);
    }
  }

  private runInBrowser(
    devtoolsSession: IDevtoolsSession,
    contextId: number,
    expressionToRun: string,
  ) {
    const response = devtoolsSession.send('Runtime.evaluate', {
      expression: expressionToRun,
      contextId,
      awaitPromise: false,
      returnByValue: false,
    });
    response.catch(err => {
      if (err instanceof CanceledPromiseError) return;
      throw err;
    });
  }

  private handleIncomingMessageFromBrowser(event: any) {
    if (event.name !== ___sendToCore) return;
    const [destLocation, responseCode, stringifiedMessage] =
      extractStringifiedComponentsFromMessage(event.payload);
    if (isResponseMessage(event.payload)) {
      const { responseId, payload } = JSON.parse(stringifiedMessage);
      const waitingForResponse = this.pendingByResponseId[responseId];
      waitingForResponse.resolve(payload);
    } else {
      this.emit('message', event.payload, { destLocation });
    }
  }

  private onContextCreated(
    page: IPuppetPage,
    event: Protocol.Runtime.ExecutionContextCreatedEvent,
  ): void {
    if (!event.context.origin.startsWith(`chrome-extension://${extensionId}`)) return;
    if (!this.pageMap.has(page.id)) {
      this.pageMap.set(page.id, { contextIds: new Set(), puppetPage: page });
    }
    this.pageMap.get(page.id).contextIds.add(event.context.id);
  }

  private onContextDestroyed(
    page: IPuppetPage,
    event: Protocol.Runtime.ExecutionContextDestroyedEvent,
  ): void {
    const { contextIds } = this.pageMap.get(page.id) || {};
    if (!contextIds) return;

    contextIds.delete(event.executionContextId);
    if (!contextIds.size) {
      this.pageMap.delete(page.id);
    }
  }

  private onContextCleared(page: IPuppetPage): void {
    this.pageMap.delete(page.id);
  }
}
