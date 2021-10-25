import {
  MessageLocation,
  IMessageObject,
  ResponseCode,
  isResponseMessage,
  messageExpectsResponse,
  createResponseId,
  IMessageLocation,
} from '@ulixee/apps-chromealive-core/lib/BridgeHelpers';
import logDebug from '../logDebug';

type IResponseFn = (response: any) => void;

const currentMessengerLocation = MessageLocation.BackgroundScript;

export function sendToContentScript(tabId: number, payload: any, responseCallbackFn?: IResponseFn) {
  const message: IMessageObject = {
    destLocation: MessageLocation.ContentScript,
    origLocation: currentMessengerLocation,
    payload,
    ...convertResponseFnToCodeAndId(responseCallbackFn),
  };
  const sendToAllTabs = !tabId;
  routeInternally(message, { sendToAllTabs, tabId }).catch(console.error);
}

export function sendToDevtoolsPrivate(payload: any, responseCallbackFn?: IResponseFn) {
  const message: IMessageObject = {
    destLocation: MessageLocation.DevtoolsPrivate,
    origLocation: currentMessengerLocation,
    payload,
    ...convertResponseFnToCodeAndId(responseCallbackFn),
  };
  routeInternally(message).catch(console.error);
}

export function sendToCore(payload, responseCallbackFn?: IResponseFn) {
  const message: IMessageObject = {
    destLocation: MessageLocation.Core,
    origLocation: currentMessengerLocation,
    payload,
    ...convertResponseFnToCodeAndId(responseCallbackFn),
  };
  routeInternally(message).catch(console.error);
}

let onMessageFn;
export function onMessagePayload(fn: (payload: any, responseFn: IResponseFn) => void) {
  if (onMessageFn) throw new Error('onMessage has already been called');
  onMessageFn = fn;
}

// INTERNAL VARIABLES //////////////////////////////////////////////////////////////////////////////

const portsByTabId: {
  [tabId: number]: {
    contentScript?: chrome.runtime.Port;
    devtoolsVue?: chrome.runtime.Port;
  };
} = {};

const pendingByResponseId: {
  [id: string]: {
    responseFn: IResponseFn;
    timeoutId: number;
  };
} = {};

// LISTENERS ///////////////////////////////////////////////////////////////////////////////////////

chrome.runtime.onConnect.addListener(port => {
  const portIdentifiers = (port.name || '').split(':');
  const portLocation = MessageLocation[portIdentifiers[0]];
  const tabId = portIdentifiers[1] ? Number(portIdentifiers[1]) : port.sender.tab?.id;

  if (!portLocation || !tabId) {
    port.disconnect();
    logDebug('Unknown port connection');
  }
  registerPort(tabId, portLocation as IMessageLocation, port);

  try {
    port.onMessage.addListener((message: IMessageObject) => {
      if (message.destLocation === currentMessengerLocation) {
        if (isResponseMessage(message)) {
          handleIncomingLocalResponse(message);
        } else {
          handleIncomingLocalMessage(message);
        }
      } else {
        routeInternally(message).catch(console.error);
      }
    });
    port.onDisconnect.addListener(() => {
      if (tabId) unregisterPort(tabId, portLocation);
    });
    if (portLocation === MessageLocation.ContentScript) {
      if(!port.sender.tab) {
        logDebug('MISSING tab: ', port.sender);
      }
      const message: IMessageObject = {
        destLocation: MessageLocation.Core,
        origLocation: currentMessengerLocation,
        payload: {
          event: 'OnTabIdentify',
          tabId,
          windowId: port.sender.tab.windowId,
        },
        responseCode: ResponseCode.N,
      };
      routeInternally(message, { tabId }).catch(error => logDebug(error));
    }
  } catch (e) {
    logDebug('ERROR: ', e);
    // nothing to do here
  }
});

// HELPERS ///////////////////////////////////////////////////////////////////////////

function handleIncomingLocalMessage(message: IMessageObject) {
  const needsResponse = messageExpectsResponse(message);
  const responseFn = needsResponse ? response => sendResponseBack(message, response) : undefined;
  onMessageFn(message.payload, responseFn);
}

function handleIncomingLocalResponse(response: IMessageObject) {
  const pending = pendingByResponseId[response.responseId];
  if (!pending) {
    throw new Error(`Incoming response (${response.responseId}) could not be handled`);
  }
  delete pendingByResponseId[response.responseId];
  clearTimeout(pending.timeoutId);
  pending.responseFn(response.payload);
}

function sendResponseBack(message: IMessageObject, responsePayload) {
  const responseCode = ResponseCode.R;
  const { responseId, origTabId: tabId, origLocation: destLocation } = message;
  const response: IMessageObject = {
    destLocation,
    origLocation: currentMessengerLocation,
    responseId,
    responseCode,
    payload: responsePayload,
  };
  routeInternally(response, { tabId }).catch(console.error);
}

// INTERNAL ROUTING ////////////////////////////////////////////////////////////////////////////////

interface IInternalSendOptions {
  tabId?: number;
  sendToAllTabs?: boolean;
}

async function routeInternally(
  message: IMessageObject,
  options: IInternalSendOptions = {},
): Promise<void> {
  const { tabId, sendToAllTabs } = options;

  if (tabId) {
    routeInternallyToTab(tabId, message);
    return;
  }

  const window = await getActiveWindow();
  const activeTabs = await getActiveTabs(window.id);
  for (const tab of activeTabs) {
    const didPost = routeInternallyToTab(tab.id, message);
    if (didPost && !sendToAllTabs) return;
  }
}

function routeInternallyToTab(
  tabId: number,
  message: IMessageObject,
  isRetry = false,
): boolean {
  try {
    const port = connectToTabContentScript(tabId, message.destLocation);
    if (port) {
      port.postMessage(message);
      return true;
    }
  } catch (e) {
    if (String(e).match(/Attempting to use a disconnected port object/)) {
      unregisterPort(tabId, message.destLocation);
      if (!isRetry) return routeInternallyToTab(tabId, message, true);
    }
    logDebug('Error connecting to tab', { tabId, e });
  }
  return false;
}

function registerPort(tabId: number, portLocation: IMessageLocation, port: chrome.runtime.Port) {
  portsByTabId[tabId] ??= {};
  portsByTabId[tabId][portLocation] = port;
}

function unregisterPort(tabId: number, portLocation: IMessageLocation) {
  delete portsByTabId[tabId][portLocation];
  if (!Object.keys(portsByTabId[tabId]).length) {
    delete portsByTabId[tabId];
  }
}

const sendThroughContentScript: IMessageLocation[] = [MessageLocation.ContentScript, MessageLocation.Core, MessageLocation.DevtoolsPrivate ];
function findPort(tabId: number, portLocation: IMessageLocation) {
  const nextPortLocation = sendThroughContentScript.includes(portLocation) ? MessageLocation.ContentScript : portLocation;
  if (!portsByTabId[tabId]) return;
  return portsByTabId[tabId][nextPortLocation];
}

function connectToTabContentScript(
  tabId: number,
  portLocation: IMessageLocation,
): chrome.runtime.Port {
  let port = findPort(tabId, portLocation);
  if (port) return port;
  if (portLocation !== MessageLocation.ContentScript) return;
  try {
    port = chrome.tabs.connect(tabId, { name: currentMessengerLocation, frameId: 0 });
    registerPort(tabId, portLocation, port);
    return port;
  } catch (err) {
    /* nothing */
  }
}

async function getActiveWindow(): Promise<chrome.windows.Window> {
  const window = await chrome.windows.getCurrent();
  return window || (await chrome.windows.getLastFocused());
}

function getActiveTabs(windowId: number): Promise<chrome.tabs.Tab[]> {
  return chrome.tabs.query({ active: true, windowId });
}

function convertResponseFnToCodeAndId(responseFn: IResponseFn) {
  if (responseFn) {
    const responseId = createResponseId();
    pendingByResponseId[responseId] = {
      responseFn,
      timeoutId: setTimeout(() => {
        throw new Error(`Response for ${responseId} not received within 10s`);
      }, 10e3),
    };
    return {
      responseCode: ResponseCode.Y,
      responseId,
    };
  }
  return {
    responseCode: ResponseCode.N,
  };
}
