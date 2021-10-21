import { EventEmitter } from 'events';
import { CanceledPromiseError } from '@ulixee/commons/interfaces/IPendingWaitEvent';
import IDevtoolsSession, { Protocol } from '@ulixee/hero-interfaces/IDevtoolsSession';
import { extensionId } from '../ExtensionUtils'
import {
  ___sendToCore,
  ___receiveFromCore,
  MessageEventType,
  extractStringifiedComponentsFromMessage,
} from '../BridgeHelpers';

export default class BridgeToDevtoolsPrivate extends EventEmitter {
  private devtoolsSessionMap: Map<IDevtoolsSession, Set<number>> = new Map();

  public addDevtoolsSession(devtoolsSession: IDevtoolsSession) {
    this.devtoolsSessionMap.set(devtoolsSession, new Set());

    devtoolsSession.on('Runtime.executionContextCreated', event => this.onContextCreated(devtoolsSession, event));
    devtoolsSession.on('Runtime.executionContextDestroyed', event => this.onContextDestroyed(devtoolsSession, event));
    devtoolsSession.on('Runtime.executionContextsCleared', () => this.onContextCleared(devtoolsSession));

    devtoolsSession.on('Runtime.bindingCalled', event => this.handleIncomingMessageFromBrowser(event));

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
            } else {
              console.log('UNHANDLED MESSAGE FROM CORE: ', destLocation, responseCode, payload);
            }
          };
          (${interceptElementOverlayDispatches.toString()})('${___sendToCore}', '${MessageEventType.OverlayDispatched}');     
        })();`,
      }),
      devtoolsSession.send('Runtime.runIfWaitingForDebugger'),
    ]).catch(() => null);
  }

  public close() {
    this.devtoolsSessionMap = new Map();
  }

  public send(message: any) {
    const [destLocation, responseCode, restOfMessage] = extractStringifiedComponentsFromMessage(message);
    const devtoolsSessionEntry = this.devtoolsSessionMap.entries().next().value;
    if (!devtoolsSessionEntry) return;

    const [devtoolsSession, contextIds] = devtoolsSessionEntry;
    const contextId = contextIds[0];
    return this.runInBrowser(
      devtoolsSession,
      contextId,
      `window.${___receiveFromCore}('${destLocation}', '${responseCode}', ${restOfMessage});`
    );
  }

  private runInBrowser(devtoolsSession: IDevtoolsSession, contextId: number, expressionToRun: string) {
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
    const [destLocation] = extractStringifiedComponentsFromMessage(event.payload);
    this.emit('message', event.payload, { destLocation });
  }

  private onContextCreated(devtoolsSession: IDevtoolsSession, event: Protocol.Runtime.ExecutionContextCreatedEvent): void {
    if (!this.devtoolsSessionMap.has(devtoolsSession)) {
      this.devtoolsSessionMap.set(devtoolsSession, new Set());
    }
    this.devtoolsSessionMap.get(devtoolsSession).add(event.context.id);
  }

  private onContextDestroyed(devtoolsSession: IDevtoolsSession, event: Protocol.Runtime.ExecutionContextDestroyedEvent): void {
    const contextIds = this.devtoolsSessionMap.get(devtoolsSession);
    if (!contextIds) return;

    contextIds.delete(event.executionContextId);
    if (!contextIds.size) {
      this.devtoolsSessionMap.delete(devtoolsSession)
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
    globalDevToolsAPI.dispatchMessage = dispatchMessageOverride
  }, 1);
}
