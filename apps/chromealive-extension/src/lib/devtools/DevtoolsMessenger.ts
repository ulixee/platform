import {
  MessageLocation,
  IMessageObject,
  ResponseCode,
  isResponseMessage,
  messageExpectsResponse,
  createResponseId,
  ___receiveFromCore,
  IMessageLocation,
  IResponseCode,
  IRestOfMessageObject,
  packMessage,
  ___sendToCore,
} from '@ulixee/apps-chromealive-core/lib/BridgeHelpers';

type IResponseFn = (response: any) => void;

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
  } else {
    throw new Error('Unknown destLocation');
  }
};


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
  const packedMessage = packMessage(message);
  window[___sendToCore](packedMessage);
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
