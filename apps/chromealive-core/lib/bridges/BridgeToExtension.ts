import { EventEmitter } from 'events';
import IDevtoolsSession, { Protocol } from '@ulixee/hero-interfaces/IDevtoolsSession';
import { IPuppetPage } from '@ulixee/hero-interfaces/IPuppetPage';
import { CanceledPromiseError } from '@ulixee/commons/interfaces/IPendingWaitEvent';
import { createPromise } from '@ulixee/commons/lib/utils';
import IResolvablePromise from '@ulixee/commons/interfaces/IResolvablePromise';
import { extensionId } from '../ExtensionUtils';
import ChromeAliveCore from '../../index';
import {
  ___receiveFromCore,
  ___sendToCore,
  extractStringifiedComponentsFromMessage,
  extractResponseIdFromMessage,
  messageExpectsResponse,
  isResponseMessage,
} from '../BridgeHelpers';

export default class BridgeToExtension extends EventEmitter {
  private puppetDetailsByPageId: Map<string, { contextId: number; puppetPage: IPuppetPage }> = new Map();
  private devtoolsSessionsByPageId: { [pageId: string]: IDevtoolsSession } = {};
  private pendingByResponseId: { [id: string]: IResolvablePromise<any> } = {};

  public getContextIdByPuppetPageId(puppetPageId: string) {
    const puppetDetails = this.puppetDetailsByPageId.get(puppetPageId);
    return puppetDetails ? puppetDetails.contextId : null;
  }

  public getDevtoolsSessionByPuppetPageId(puppetPageId: string) {
    return this.devtoolsSessionsByPageId[puppetPageId];
  }

  public addPuppetPage(page: IPuppetPage): Promise<any> {
    const { devtoolsSession } = page;
    this.devtoolsSessionsByPageId[page.id] = devtoolsSession;

    page.on('close', () => {
      this.closePuppetPage(page)
      delete this.devtoolsSessionsByPageId[page.id];
    });
    page.on('close', () => this.closePuppetPage(page));

    devtoolsSession.on('Runtime.executionContextCreated', event => {
      this.onContextCreated(page, event);
    });

    devtoolsSession.on('Runtime.executionContextDestroyed', event => {
      this.onContextDestroyed(page, event);
    });
    devtoolsSession.on('Runtime.executionContextsCleared', () => this.onContextCleared(page));

    devtoolsSession.on('Runtime.bindingCalled', event => {
      this.handleIncomingMessageFromBrowser(event, page.id);
    });

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
    const puppetContext = this.puppetDetailsByPageId.get(puppetPageId);
    if (!puppetContext) {
      console.log(`No puppet details for ${puppetPageId}`);
      return Promise.resolve();
    }
    this.runInBrowser(
      puppetContext.puppetPage.devtoolsSession,
      puppetContext.contextId,
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
    this.puppetDetailsByPageId.delete(page.id);
  }

  public close() {
    for (const { puppetPage } of this.puppetDetailsByPageId.values()) {
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

  private handleIncomingMessageFromBrowser(event: any, puppetPageId: string) {
    if (event.name !== ___sendToCore) return;
    const [destLocation, responseCode, stringifiedMessage] =
      extractStringifiedComponentsFromMessage(event.payload);
    if (isResponseMessage(event.payload)) {
      const { responseId, payload } = JSON.parse(stringifiedMessage);
      const waitingForResponse = this.pendingByResponseId[responseId];
      waitingForResponse.resolve(payload);
    } else {
      this.emit('message', event.payload, {
        destLocation,
        responseCode,
        stringifiedMessage,
        puppetPageId,
      });
    }
  }

  private onContextCreated(
    puppetPage: IPuppetPage,
    event: Protocol.Runtime.ExecutionContextCreatedEvent,
  ): void {
    if (!event.context.origin.startsWith(`chrome-extension://${extensionId}`)) return;
    this.puppetDetailsByPageId.set(puppetPage.id, { contextId: event.context.id, puppetPage: puppetPage });
  }

  private onContextDestroyed(
    page: IPuppetPage,
    event: Protocol.Runtime.ExecutionContextDestroyedEvent,
  ): void {
    const pageDetails = this.puppetDetailsByPageId.get(page.id);
    if (pageDetails && pageDetails.contextId === event.executionContextId) {
      this.puppetDetailsByPageId.delete(page.id)
    }
  }

  private onContextCleared(page: IPuppetPage): void {
    this.puppetDetailsByPageId.delete(page.id);
  }
}
