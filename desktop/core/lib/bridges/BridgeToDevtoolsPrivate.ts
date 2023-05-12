import { EventEmitter } from 'events';
import { CanceledPromiseError } from '@ulixee/commons/interfaces/IPendingWaitEvent';
import IDevtoolsSession, { Protocol } from '@ulixee/unblocked-specification/agent/browser/IDevtoolsSession';
import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';
import { extensionId } from '../ExtensionUtils';
import {
  ___sendToCore,
  ___receiveFromCore,
  MessageEventType,
  extractStringifiedComponentsFromMessage,
  IMessageObject,
} from '../BridgeHelpers';

export default class BridgeToDevtoolsPrivate extends EventEmitter {
  private devtoolsSessionMap = new Map<
    IDevtoolsSession,
    { contextIds: number[]; tabId?: number }
  >();

  private events = new EventSubscriber();

  public async onDevtoolsPanelAttached(devtoolsSession: IDevtoolsSession): Promise<void> {
    this.devtoolsSessionMap.set(devtoolsSession, { contextIds: [] });

    this.events.on(devtoolsSession, 'Runtime.executionContextCreated', event =>
      this.onContextCreated(devtoolsSession, event),
    );
    this.events.on(devtoolsSession, 'Runtime.executionContextDestroyed', event =>
      this.onContextDestroyed(devtoolsSession, event),
    );
    this.events.on(devtoolsSession, 'Runtime.executionContextsCleared', () =>
      this.onContextCleared(devtoolsSession),
    );

    this.events.on(devtoolsSession, 'Runtime.bindingCalled', event =>
      this.handleIncomingMessageFromBrowser(event),
    );

    await Promise.all([
      devtoolsSession.send('Runtime.addBinding', { name: ___sendToCore }),
      devtoolsSession.send('Page.addScriptToEvaluateOnNewDocument', {
        source: `(function run() {
          window.___includedBackendNodeIds = new Set();
          window.___excludedBackendNodeIds = new Set();
          window.${___receiveFromCore} = function ${___receiveFromCore}(destLocation, responseCode, restOfMessage) {
            const payload = restOfMessage.payload;
            const { event, backendNodeId } = payload;
            if (event === '${MessageEventType.OpenSelectorGeneratorPanel}') {
              (${openSelectorGeneratorPanel.toString()})(DevToolsAPI, '${extensionId}');
            } else if (event === '${MessageEventType.ToggleInspectElementMode}') {
              (${toggleInspectElementMode.toString()})(InspectorFrontendAPI);
            } else if (payload.event === '${MessageEventType.CloseDevtoolsPanel}'){
              InspectorFrontendHost.closeWindow();
            } else if (event === '${MessageEventType.AddIncludedElement}') {
              window.___includedBackendNodeIds.add(backendNodeId);
            } else if (event === '${MessageEventType.RemoveIncludedElement}') {
              window.___includedBackendNodeIds.delete(backendNodeId);
            } else if (event === '${MessageEventType.AddExcludedElement}') {
              window.___excludedBackendNodeIds.add(backendNodeId);
            } else if (event === '${MessageEventType.RemoveExcludedElement}') {
              window.___excludedBackendNodeIds.delete(backendNodeId);
            } else {
              console.log('UNHANDLED MESSAGE FROM CORE: ', destLocation, responseCode, payload);
            }
          };
          (${interceptElementWasSelected.toString()})('${___sendToCore}', '${
            MessageEventType.OpenElementOptionsOverlay
          }');
          (${interceptInspectElementMode.toString()})('${___sendToCore}', '${
            MessageEventType.InspectElementModeChanged
          }');
          (${interceptElementPanelOnHighlight.toString()})('${___sendToCore}', '${
            MessageEventType.HideElementOptionsOverlay
          }');
          (${interceptElementPanelOnRemoveHighlight.toString()})('${___sendToCore}', '${
            MessageEventType.RemoveHideFromElementOptionsOverlay
          }');
          (${injectContextMenu.toString()})('${___sendToCore}', '${
            MessageEventType.UpdateElementOptions
          }');
        })();`,
      }),
      this.getDevtoolsTabId.bind(this, devtoolsSession),
      devtoolsSession.send('Runtime.runIfWaitingForDebugger'),
    ]).catch(() => null);

    const contextId = this.devtoolsSessionMap.get(devtoolsSession).contextIds[0];
    await this.runInBrowser(devtoolsSession, contextId, `(${interceptInspectElementMode.toString()})('${___sendToCore}', '${MessageEventType.InspectElementModeChanged}');`);

    // (${interceptElementOverlayDispatches.toString()})('${___sendToCore}', '${MessageEventType.CloseElementOptionsOverlay}');
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
      if (!details.tabId) {
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

  private handleIncomingMessageFromBrowser(event: any): void {
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
    if (!contextIds.includes(event.context.id)) {
      contextIds.push(event.context.id);
    }
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
function openSelectorGeneratorPanel(DevToolsAPI: any, extensionId: string): void {
  // We can get list from UI.panels
  DevToolsAPI.showPanel(`chrome-extension://${extensionId}HeroScript`);
}

function toggleInspectElementMode(InspectorFrontendAPI: any): void {
  InspectorFrontendAPI.enterInspectElementMode();
}

const interceptInspectElementMode = `
async function interceptInspectElementMode(sendToCoreFnName, eventType) {
  const globalWindow = window;
  const elements = await import('./devtools-frontend/front_end/panels/elements/elements.js');
  const InspectElementModeController = elements.InspectElementModeController.InspectElementModeController;
  const setMode = InspectElementModeController.prototype.setMode;
  function override(mode) {
    const isOn = mode === 'searchForNode';
    const payload = '{"event":"' + eventType +'","isOn": ' + isOn.toString() + '}';
    const packedMessage = ':Core                :N:{"origLocation":"DevtoolsPrivate","payload":'+ payload + '}';
    globalWindow[sendToCoreFnName](packedMessage);
    setMode.call(this, mode);
  }
  InspectElementModeController.prototype.setMode = override;
}
`;

const interceptElementPanelOnHighlight = `
async function interceptElementPanelOnHighlight(sendToCoreFnName, eventType) {
  const globalWindow = window;
  const elements = await import('./devtools-frontend/front_end/panels/elements/elements.js');
  const ElementsTreeOutline = elements.ElementsTreeOutline.ElementsTreeOutline;
  const highlightTreeElement = ElementsTreeOutline.prototype._highlightTreeElement;
  ElementsTreeOutline.prototype._highlightTreeElement = function(element, showInfo) {
    const payload = '{"event":"' + eventType + '"}';
    const packedMessage = ':ContentScript       :N:{"origLocation":"DevtoolsPrivate","payload":'+ payload + '}';
    globalWindow[sendToCoreFnName](packedMessage);
    highlightTreeElement.call(this, element, showInfo);
  }
}
`;

const interceptElementPanelOnRemoveHighlight = `
async function interceptElementPanelWasHovered(sendToCoreFnName, eventType) {
  const globalWindow = window;
  const elements = await import('./devtools-frontend/front_end/panels/elements/elements.js');
  const ElementsTreeOutline = elements.ElementsTreeOutline.ElementsTreeOutline;
  const setHoverEffect = ElementsTreeOutline.prototype.setHoverEffect;
  ElementsTreeOutline.prototype.setHoverEffect = function(treeElement) {
    if (!treeElement) {
      const payload = '{"event":"' + eventType + '"}';
      const packedMessage = ':ContentScript       :N:{"origLocation":"DevtoolsPrivate","payload":'+ payload + '}';
      globalWindow[sendToCoreFnName](packedMessage);
    }
    setHoverEffect.call(this, treeElement);
  }
}
`;

// Every time an element in page is selected for inspection
function interceptElementWasSelected(sendToCoreFnName, eventType): void {
  // @ts-ignore
  const globalWindow = window;
  // @ts-ignore
  const globalSDK = window.SDK;
  if (!globalSDK) {
    setTimeout(() => interceptElementWasSelected(sendToCoreFnName, eventType), 1);
    return;
  }

  const inspectNodeRequestedOrig = globalSDK.OverlayModel.prototype.inspectNodeRequested;
  globalSDK.OverlayModel.prototype.inspectNodeRequested = function inspectNodeRequested({ backendNodeId }) {
    const payload = `{"event":"${  eventType  }","backendNodeId": ${  backendNodeId  }}`;
    const packedMessage =
      `:ContentScript       :N:{"origLocation":"DevtoolsPrivate","payload":${  payload  }}`;
    // @ts-ignore
    globalWindow[sendToCoreFnName](packedMessage);
    inspectNodeRequestedOrig.call(this, { backendNodeId });
  };
}

// THIS CREATES CONTEXT MENU
const injectContextMenu = `
async function injectContextMenu(sendToCoreFnName, eventType) {
  const elements = await import('./devtools-frontend/front_end/panels/elements/elements.js');
  const ElementsTreeElement = elements.ElementsTreeElement.ElementsTreeElement;
  const populateNodeContextMenu = ElementsTreeElement.prototype.populateNodeContextMenu;
    
  ElementsTreeElement.prototype.populateNodeContextMenu = function(contextMenu) {
    populateNodeContextMenu.call(this, contextMenu);
    const backendNodeId = this._node._backendNodeId;
    const sgMenu = contextMenu.clipboardSection().appendSubMenuItem('Selector Generator');
    const section = sgMenu.section();
    
    const isIncluded = window.___includedBackendNodeIds.has(backendNodeId);
    const mustIncludeItem = section.appendCheckboxItem('Must Include', () => {
      const payload = { event: eventType, backendNodeId, isIncluded: !isIncluded };
      const packedMessage = ':ContentScript       :N:{"origLocation":"DevtoolsPrivate","payload":'+ JSON.stringify(payload) + '}';
      window[sendToCoreFnName](packedMessage);
    }, isIncluded);
    
    const isExcluded = window.___excludedBackendNodeIds.has(backendNodeId);
    const mustExcludeItem = section.appendCheckboxItem('Must Exclude', () => { 
      const payload = { event: eventType, backendNodeId, isExcluded: !isExcluded };
      const packedMessage = ':ContentScript       :N:{"origLocation":"DevtoolsPrivate","payload":'+ JSON.stringify(payload) + '}';
      window[sendToCoreFnName](packedMessage);
    }, isExcluded);
  }
}
`;

// Every time a node element is highlighted using Inspector in page (not devtools panel)
// SDK.OverlayModel.prototype.nodeHighlightRequested = function({nodeId}) {
//   console.log('nodeHighlightRequested', nodeId);
//   nodeHighlightRequested.call(this, {nodeId});
// }
