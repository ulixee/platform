import { EventEmitter } from 'events';
import { CanceledPromiseError } from '@ulixee/commons/interfaces/IPendingWaitEvent';
import IDevtoolsSession, { Protocol } from '@ulixee/hero-interfaces/IDevtoolsSession';
import { extensionId } from '../ExtensionUtils';
import {
  ___sendToCore,
  ___receiveFromCore,
  MessageEventType,
  extractStringifiedComponentsFromMessage,
  IMessageObject,
  MessageLocation,
  ResponseCode,
} from '../BridgeHelpers';

export default class BridgeToDevtoolsPrivate extends EventEmitter {
  private devtoolsSessionMap = new Map<
    IDevtoolsSession,
    { contextIds: number[]; tabId?: number }
  >();

  public addDevtoolsSession(devtoolsSession: IDevtoolsSession) {
    this.devtoolsSessionMap.set(devtoolsSession, { contextIds: [] });

    devtoolsSession.on('Runtime.executionContextCreated', event =>
      this.onContextCreated(devtoolsSession, event),
    );
    devtoolsSession.on('Runtime.executionContextDestroyed', event =>
      this.onContextDestroyed(devtoolsSession, event),
    );
    devtoolsSession.on('Runtime.executionContextsCleared', () =>
      this.onContextCleared(devtoolsSession),
    );

    devtoolsSession.on('Runtime.bindingCalled', event =>
      this.handleIncomingMessageFromBrowser(event),
    );

    return Promise.all([
      devtoolsSession.send('Runtime.enable'),
      devtoolsSession.send('Runtime.addBinding', { name: ___sendToCore }),
      devtoolsSession.send('Page.enable'),

      devtoolsSession.send('Page.addScriptToEvaluateOnNewDocument', {
        source: `(function run() {
          window.${___receiveFromCore} = function ${___receiveFromCore}(destLocation, responseCode, restOfMessage) {
            const payload = restOfMessage.payload;
            if (payload.event === '${MessageEventType.OpenSelectorGeneratorPanel}') {
              (${openSelectorGeneratorPanel.toString()})(DevToolsAPI, '${extensionId}');
            } else if (payload.event === '${MessageEventType.CloseDevtoolsPanel}'){
              InspectorFrontendHost.closeWindow();
            } else {
              console.log('UNHANDLED MESSAGE FROM CORE: ', destLocation, responseCode, payload);
            }
          };
          (${interceptElementOverlayDispatches.toString()})('${___sendToCore}', '${
          MessageEventType.OverlayDispatched
        }');
        })();`,
      }),
      this.getDevtoolsTabId.bind(this, devtoolsSession),
      devtoolsSession.send('Runtime.runIfWaitingForDebugger'),
    ]).catch(() => null);
  }

  public close() {
    this.devtoolsSessionMap.clear();
  }

  public async closePanel(tabId: number): Promise<void> {
    await this.send(
      {
        destLocation: MessageLocation.DevtoolsPrivate,
        origLocation: MessageLocation.Core,
        payload: { event: MessageEventType.CloseDevtoolsPanel },
        responseCode: ResponseCode.N,
      },
      tabId,
    );
  }

  public async send(message: IMessageObject | string, tabId?: number): Promise<void> {
    const [destLocation, responseCode, restOfMessage] =
      extractStringifiedComponentsFromMessage(message);

    let devtoolsSession: IDevtoolsSession;
    if (tabId) {
      devtoolsSession = await this.getDevtoolsSessionWithTabId(tabId);
    }

    devtoolsSession ??= this.devtoolsSessionMap.keys().next().value;
    const contextId = this.devtoolsSessionMap.get(devtoolsSession).contextIds[0];

    await this.runInBrowser(
      devtoolsSession,
      contextId,
      `window.${___receiveFromCore}('${destLocation}', '${responseCode}', ${restOfMessage});`,
    );
  }

  private async getDevtoolsSessionWithTabId(tabId: number): Promise<IDevtoolsSession> {
    for (const [session, details] of this.devtoolsSessionMap) {
      if (details.tabId === tabId) return session;
      else if (!details.tabId) {
        const loadedTabId = await this.getDevtoolsTabId(session);
        if (loadedTabId === tabId) return session;
      }
    }
  }

  private async getDevtoolsTabId(devtoolsSession: IDevtoolsSession, retries = 3): Promise<number> {
    const response = await devtoolsSession.send('Runtime.evaluate', {
      expression: 'DevToolsAPI.getInspectedTabId()',
    });
    const tabId = response.result.value;
    if (!tabId) {
      if (retries <= 0) return;
      await new Promise(resolve => setTimeout(resolve, 250));
      return await this.getDevtoolsTabId(devtoolsSession, retries - 1);
    }
    if (!this.devtoolsSessionMap.has(devtoolsSession))
      this.devtoolsSessionMap.set(devtoolsSession, { contextIds: [] });
    this.devtoolsSessionMap.get(devtoolsSession).tabId = tabId;
    return tabId;
  }

  private runInBrowser(
    devtoolsSession: IDevtoolsSession,
    contextId: number,
    expressionToRun: string,
  ): Promise<any> {
    return devtoolsSession
      .send('Runtime.evaluate', {
        expression: expressionToRun,
        contextId,
        awaitPromise: false,
        returnByValue: false,
      })
      .catch(err => {
        if (err instanceof CanceledPromiseError) return;
        throw err;
      });
  }

  private handleIncomingMessageFromBrowser(event: any) {
    if (event.name !== ___sendToCore) return;
    const [destLocation] = extractStringifiedComponentsFromMessage(event.payload);
    this.emit('message', event.payload, { destLocation });
  }

  private onContextCreated(
    devtoolsSession: IDevtoolsSession,
    event: Protocol.Runtime.ExecutionContextCreatedEvent,
  ): void {
    if (!this.devtoolsSessionMap.has(devtoolsSession)) {
      this.devtoolsSessionMap.set(devtoolsSession, { contextIds: [] });
    }
    const contextIds = this.devtoolsSessionMap.get(devtoolsSession).contextIds;
    if (!contextIds.includes(event.context.id)) contextIds.push(event.context.id);
  }

  private onContextDestroyed(
    devtoolsSession: IDevtoolsSession,
    event: Protocol.Runtime.ExecutionContextDestroyedEvent,
  ): void {
    const contextIds = this.devtoolsSessionMap.get(devtoolsSession)?.contextIds;
    if (!contextIds) return;

    const idx = contextIds.indexOf(event.executionContextId);
    if (idx >= 0) contextIds.splice(idx, 1);
    if (!contextIds.length) {
      this.devtoolsSessionMap.delete(devtoolsSession);
    }
  }

  private onContextCleared(devtoolsSession: IDevtoolsSession): void {
    this.devtoolsSessionMap.delete(devtoolsSession);
  }
}

// METHODS TO RUN IN BROWSER CONTEXT ////////////////////////////////////////////////////////

// eslint-disable-next-line @typescript-eslint/no-shadow
function openSelectorGeneratorPanel(DevToolsAPI: any, extensionId: string) {
  // We can get list from UI.panels
  DevToolsAPI.showPanel(`chrome-extension://${extensionId}SelectorGenerator`);
}

// eslint-disable-next-line @typescript-eslint/no-shadow
function interceptElementOverlayDispatches(__sendToCore: string, eventType: string) {
  // @ts-ignore
  const globalWindow = window;
  // @ts-ignore
  let globalDevToolsAPI = DevToolsAPI;
  const dispatchMessage = globalDevToolsAPI.dispatchMessage.bind(globalDevToolsAPI);
  function dispatchMessageOverride(message) {
    if (message.includes('"method":"Overlay.')) {
      const payload = `{"event":"${eventType}"}`;
      const packedMessage = `:ContentScript       :N:{"origLocation":"DevtoolsPrivate","payload":${payload}`;
      globalWindow[__sendToCore](packedMessage);
    }
    return dispatchMessage(message);
  }
  globalDevToolsAPI.dispatchMessage = dispatchMessageOverride;
  setTimeout(() => {
    // @ts-ignore
    globalDevToolsAPI = DevToolsAPI;
    globalDevToolsAPI.dispatchMessage = dispatchMessageOverride;
  }, 1);
}
