import {
  ___receiveFromCore,
  MessageLocation,
  packMessage,
  IMessageObject,
  IMessageLocation,
  IResponseCode,
  IRestOfMessageObject,
  ResponseCode,
  ___sendToCore, createResponseId, isResponseMessage, messageExpectsResponse,
} from '@ulixee/apps-chromealive-core/lib/BridgeHelpers';
import logDebug from '../logDebug';

type IResponseFn = (response: any) => void;

const currentMessengerLocation = MessageLocation.ContentScript;

export function sendToBackgroundScript(payload: any, responseCallbackFn?: IResponseFn) {
  const message: IMessageObject  = {
    destLocation: MessageLocation.BackgroundScript,
    origLocation: currentMessengerLocation,
    payload,
    ...convertResponseFnToCodeAndId(responseCallbackFn),
  }
  routeInternally(message);
}

// @ts-ignore
window.sendToBackgroundScript = sendToBackgroundScript;

export function sendToDevtoolsScript(payload: any, responseCallbackFn?: IResponseFn) {
  const message: IMessageObject  = {
    destLocation: MessageLocation.DevtoolsScript,
    origLocation: currentMessengerLocation,
    payload,
    ...convertResponseFnToCodeAndId(responseCallbackFn),
  }
  routeInternally(message);
}

// @ts-ignore
window.sendToDevtoolsScript = sendToDevtoolsScript;

export function sendToDevtoolsPrivate(payload: any, responseCallbackFn?: IResponseFn) {
  const message: IMessageObject  = {
    destLocation: MessageLocation.DevtoolsPrivate,
    origLocation: currentMessengerLocation,
    payload,
    ...convertResponseFnToCodeAndId(responseCallbackFn),
  }
  routeInternally(message);
}

export function sendToCore(payload: any, responseCallbackFn?: IResponseFn) {
  const message: IMessageObject  = {
    destLocation: MessageLocation.Core,
    origLocation: currentMessengerLocation,
    payload,
    ...convertResponseFnToCodeAndId(responseCallbackFn),
  }
  routeInternally(message);
}

let onMessageFn;
export function onMessage(fn: (payload: any, responseFn: IResponseFn) => void) {
  if (onMessageFn) throw new Error('onMessage has already been called');
  onMessageFn = fn;
}

// LISTENER TO <-> FROM BACKGROUND /////////////////////////////////////////////////////////////////

let activePort: chrome.runtime.Port;
chrome.runtime.onConnect.addListener(handleConnectFromBackgroundScript);

function connect() {
  try {
    if (activePort) return;
    const port = chrome.runtime.connect({ name: currentMessengerLocation });
    handleConnectedToBackgroundScript(port);
  } catch (err) {
    console.error('Error connecting to service worker', err);
    setTimeout(connect, 5e3);
  }
}

function handleConnectFromBackgroundScript(port: chrome.runtime.Port) {
  logDebug(`OnConnect from BackgroundScript`, port);
  activePort = port;
  activePort.onDisconnect.addListener(() => {
    activePort.onMessage.removeListener(handleIncomingMessageFromBackgroundScript);
    activePort = null;
    setTimeout(connect, 1e3);
  });
  activePort.onMessage.addListener(handleIncomingMessageFromBackgroundScript);
}

function handleConnectedToBackgroundScript(port: chrome.runtime.Port) {
  logDebug(`OnConnect to BackgroundScript`, port);
  activePort = port;
  activePort.onDisconnect.addListener(() => {
    activePort.onMessage.removeListener(handleIncomingMessageFromBackgroundScript);
    activePort = null;
    setTimeout(connect, 1e3);
  });
  activePort.onMessage.addListener(handleIncomingMessageFromBackgroundScript);
}

function handleIncomingMessageFromBackgroundScript(message: IMessageObject) {
  logDebug(`OnIncomingMessage from BackgroundScript`, JSON.stringify(message));
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

// LISTENER TO <-> FROM CORE ///////////////////////////////////////////////////////////////////////

// receive and route messages coming in from core
window[___receiveFromCore] = (
  destLocation: IMessageLocation,
  responseCode: IResponseCode,
  restOfMessage: IRestOfMessageObject,
) => {
  const message: IMessageObject = {
    destLocation,
    responseCode,
    ...restOfMessage,
  };
  if (message.destLocation === currentMessengerLocation) {
    if (isResponseMessage(message)) {
      handleIncomingLocalResponse(message);
    } else {
      handleIncomingLocalMessage(message);
    }
  } else if (destLocation === MessageLocation.BackgroundScript) {
    routeInternally(message);
  } else {
    throw new Error('Unknown destLocation');
  }
};

// INTERNAL VARIABLES //////////////////////////////////////////////////////////////////////////////

const pendingByResponseId: {
  [id: string]: {
    responseFn: IResponseFn,
    timeoutId: number,
  }
} = {};

// HELPERS ///////////////////////////////////////////////////////////////////////////

function handleIncomingLocalMessage(message: IMessageObject) {
  const needsResponse = messageExpectsResponse(message);
  const responseFn = needsResponse
    ? response => sendResponseBack(message, response)
    : undefined;
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
  const { responseId, origLocation: destLocation } = message;
  const response: IMessageObject = {
    destLocation,
    origLocation: MessageLocation.BackgroundScript,
    responseId,
    responseCode,
    payload: responsePayload,
  };
  routeInternally(response);
}

// INTERNAL ROUTING ////////////////////////////////////////////////////////////////////////////////

function routeInternally(message: IMessageObject) {
  // @ts-ignore
  if ([MessageLocation.BackgroundScript, MessageLocation.DevtoolsScript].includes(message.destLocation)) {
    console.log('ROUTING: ', JSON.stringify(message));
    activePort.postMessage(message);
  } else {
    const packedMessage = packMessage(message);
    window[___sendToCore](packedMessage);
  }
}

function convertResponseFnToCodeAndId(responseFn: IResponseFn) {
  if (responseFn) {
    const responseId = createResponseId();
    pendingByResponseId[responseId] = {
      responseFn,
      timeoutId: setTimeout(() => {
        throw new Error(`Response for ${responseId} not received within 10s`);
      }, 10e3),
    }
    return {
      responseCode: ResponseCode.Y,
      responseId,
    };
  }
  return {
    responseCode: ResponseCode.N,
  };
}
