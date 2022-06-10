import {
  MessageLocation,
  IMessageObject,
  ResponseCode,
  isResponseMessage,
  messageExpectsResponse,
  createResponseId,
} from '@ulixee/apps-chromealive-core/lib/BridgeHelpers';

type IPort = chrome.runtime.Port;
type IResponseFn = (response: any) => void;

const currentTabId = chrome.devtools.inspectedWindow.tabId;
const currentMessengerLocation = MessageLocation.DevtoolsScript;

export function sendToContentScript(tabId: number, payload: any, responseCallbackFn?: IResponseFn) {
  const message: IMessageObject = {
    destLocation: MessageLocation.ContentScript,
    origLocation: currentMessengerLocation,
    payload,
    ...convertResponseFnToCodeAndId(responseCallbackFn),
  };
  routeInternally(message);
}

export function sendToBackgroundScript(payload: any, responseCallbackFn?: IResponseFn) {
  const message: IMessageObject = {
    destLocation: MessageLocation.BackgroundScript,
    origLocation: currentMessengerLocation,
    payload,
    ...convertResponseFnToCodeAndId(responseCallbackFn),
  };
  routeInternally(message);
}

export function sendToDevtoolsPrivate(payload: any, responseCallbackFn?: IResponseFn) {
  const message: IMessageObject = {
    destLocation: MessageLocation.DevtoolsPrivate,
    origLocation: currentMessengerLocation,
    payload,
    ...convertResponseFnToCodeAndId(responseCallbackFn),
  };
  routeInternally(message);
}

export function sendToCore(payload, responseCallbackFn?: IResponseFn) {
  const message: IMessageObject = {
    destLocation: MessageLocation.Core,
    origLocation: currentMessengerLocation,
    payload,
    ...convertResponseFnToCodeAndId(responseCallbackFn),
  };
  routeInternally(message);
}

// LISTEN TO MESSAGES //////////////////////////////////////////////////////////////////////////////

let onMessageFn;
export function onMessagePayload(fn: (payload: any, responseFn: IResponseFn) => void) {
  if (onMessageFn) throw new Error('onMessage has already been set');
  onMessageFn = fn;
}

export function offMessage() {
  onMessageFn = undefined;
}

// INTERNAL VARIABLES //////////////////////////////////////////////////////////////////////////////

const pendingByResponseId: {
  [id: string]: {
    responseFn: IResponseFn;
    timeoutId: any;
  };
} = {};

// LISTENER TO <-> FROM BACKGROUND /////////////////////////////////////////////////////////////////

let activePort: IPort;

function connect() {
  try {
    if (activePort) return;
    if (!currentTabId || currentTabId === -1) {
      console.warn('No tab id to register for devtools');
      return;
    }
    const port = chrome.runtime.connect({ name: `${currentMessengerLocation}:${currentTabId}` });
    handleConnectedToBackgroundScript(port);
  } catch (err) {
    console.error('Error connecting to service worker', err);
    setTimeout(connect, 5e3);
  }
}

function disconnectPort(port: IPort) {
  console.log('DISCONNECTED from BackgroundScript');
  port.onMessage.removeListener(handleIncomingMessageFromBackgroundScript);
  if (port === activePort) {
    activePort = null;
    setTimeout(connect, 1e3);
  }
}

function handleConnectedToBackgroundScript(port: IPort) {
  if (activePort === port) return;
  if (activePort && activePort !== port) {
    try {
      activePort.disconnect();
    } catch (err) {
      /* no-op */
    }
  }
  activePort = port;
  activePort.onDisconnect.addListener(disconnectPort.bind(null, port));
  activePort.onMessage.addListener(handleIncomingMessageFromBackgroundScript);
}

function handleIncomingMessageFromBackgroundScript(message: IMessageObject) {
  if (message.destLocation === currentMessengerLocation) {
    if (isResponseMessage(message)) {
      handleIncomingLocalResponse(message);
    } else {
      handleIncomingLocalMessage(message);
    }
  } else {
    // pass it along
    routeInternally(message);
  }
}

connect();

// HELPERS //////////////////////////////////////////////////////////////////////////////////////////

function handleIncomingLocalMessage(message: IMessageObject) {
  const needsResponse = messageExpectsResponse(message);
  const responseFn = needsResponse ? response => routeResponseBack(message, response) : undefined;
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

function routeResponseBack(message: IMessageObject, responsePayload) {
  const responseCode = ResponseCode.R;
  const { responseId, origLocation: destLocation } = message;
  const response: IMessageObject = {
    destLocation,
    origLocation: currentMessengerLocation,
    responseId,
    responseCode,
    payload: responsePayload,
  };
  routeInternally(response);
}

// INTERNAL ROUTING ////////////////////////////////////////////////////////////////////////////////

function routeInternally(message: IMessageObject) {
  activePort.postMessage(message);
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
