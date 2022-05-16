import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';
import { EventEmitter } from 'events';
import IDevtoolsSession, { Protocol } from '@unblocked-web/specifications/agent/browser/IDevtoolsSession';
import { IPage } from '@unblocked-web/specifications/agent/browser/IPage';
import { CanceledPromiseError } from '@ulixee/commons/interfaces/IPendingWaitEvent';
import { createPromise } from '@ulixee/commons/lib/utils';
import IResolvablePromise from '@ulixee/commons/interfaces/IResolvablePromise';
import { extensionId } from '../ExtensionUtils';
import ChromeAliveCore from '../../index';
import {
  ___receiveFromCore,
  ___sendToCore,
  extractResponseIdFromMessage,
  extractStringifiedComponentsFromMessage,
  isResponseMessage,
  messageExpectsResponse,
} from '../BridgeHelpers';
import Log from '@ulixee/commons/lib/Logger';

const { log } = Log(module);

export default class BridgeToExtension extends EventEmitter {
  private contextIdByPageId = new Map<string, number>();
  private devtoolsSessionsByPageId: { [pageId: string]: IDevtoolsSession } = {};
  private pendingByResponseId: { [id: string]: IResolvablePromise<any> } = {};

  public getContextIdByPageId(pageId: string): number | null {
    return this.contextIdByPageId.get(pageId) ?? null;
  }

  public getDevtoolsSessionByPageId(pageId: string): IDevtoolsSession {
    return this.devtoolsSessionsByPageId[pageId];
  }

  public addPage(page: IPage, events: EventSubscriber): Promise<any> {
    const { devtoolsSession, id } = page;
    this.devtoolsSessionsByPageId[id] = devtoolsSession;

    events.once(page, 'close', this.closePage.bind(this, id));

    events.on(
      devtoolsSession,
      'Runtime.executionContextCreated',
      this.onContextCreated.bind(this, id),
    );

    events.on(
      devtoolsSession,
      'Runtime.executionContextDestroyed',
      this.onContextDestroyed.bind(this, id),
    );

    events.on(
      devtoolsSession,
      'Runtime.executionContextsCleared',
      this.onContextCleared.bind(this, id),
    );

    events.on(
      devtoolsSession,
      'Runtime.bindingCalled',
      this.handleIncomingMessageFromBrowser.bind(this, id),
    );

    return Promise.all([
      devtoolsSession.send('Runtime.addBinding', { name: ___sendToCore }),
      devtoolsSession.send('Runtime.runIfWaitingForDebugger'),
    ]).catch(() => null);
  }

  public send<T = any>(message: any, pageId?: string): Promise<T | void> {
    const [destLocation, responseCode, restOfMessage] =
      extractStringifiedComponentsFromMessage(message);
    pageId ??= ChromeAliveCore.getActivePage()?.id;
    if (!pageId) {
      throw new Error(`No active browser page ${pageId}`);
    }
    const contextId = this.getContextIdByPageId(pageId);
    if (!contextId) {
      log.warn(`No browser execution context for ${pageId}`, {
        sessionId: null,
        pageId,
      });
      return Promise.resolve();
    }
    const devtoolsSession = this.getDevtoolsSessionByPageId(pageId);
    this.runInBrowser(
      devtoolsSession,
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

  public closePage(pageId: string): void {
    this.contextIdByPageId.delete(pageId);
  }

  public close(): void {
    this.contextIdByPageId.clear();
  }

  private runInBrowser(
    devtoolsSession: IDevtoolsSession,
    contextId: number,
    expressionToRun: string,
  ): void {
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

  private handleIncomingMessageFromBrowser(
    pageId: string,
    event: Protocol.Runtime.BindingCalledEvent,
  ): void {
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
        pageId,
      });
    }
  }

  private onContextCreated(
    pageId: string,
    event: Protocol.Runtime.ExecutionContextCreatedEvent,
  ): void {
    if (!event.context.origin.startsWith(`chrome-extension://${extensionId}`)) return;
    this.contextIdByPageId.set(pageId, event.context.id);
  }

  private onContextDestroyed(
    pageId: string,
    event: Protocol.Runtime.ExecutionContextDestroyedEvent,
  ): void {
    if (this.contextIdByPageId.get(pageId) === event.executionContextId) {
      this.contextIdByPageId.delete(pageId);
    }
  }

  private onContextCleared(pageId: string): void {
    this.contextIdByPageId.delete(pageId);
  }
}
