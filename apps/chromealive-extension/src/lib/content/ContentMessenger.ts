import {
  ___receiveFromCore,
  ___sendToCore,
  createResponseId,
  IMessageLocation,
  IMessageObject,
  IResponseCode,
  IRestOfMessageObject,
  isResponseMessage,
  messageExpectsResponse,
  MessageLocation,
  packMessage,
  ResponseCode,
} from '@ulixee/apps-chromealive-core/lib/BridgeHelpers';

type IResponseFn = (response: any) => void;

const currentMessengerLocation = MessageLocation.ContentScript;

export function sendToDevtoolsScript(payload: any, responseCallbackFn?: IResponseFn) {
  const message: IMessageObject = {
    destLocation: MessageLocation.DevtoolsScript,
    origLocation: currentMessengerLocation,
    payload,
    ...convertResponseFnToCodeAndId(responseCallbackFn),
  };
  routeInternally(message);
}

// @ts-ignore
window.sendToDevtoolsScript = sendToDevtoolsScript;

export function sendToDevtoolsPrivate(payload: any, responseCallbackFn?: IResponseFn) {
  const message: IMessageObject = {
    destLocation: MessageLocation.DevtoolsPrivate,
    origLocation: currentMessengerLocation,
    payload,
    ...convertResponseFnToCodeAndId(responseCallbackFn),
  };
  routeInternally(message);
}

export function sendToCore(payload: any, responseCallbackFn?: IResponseFn) {
  const message: IMessageObject = {
    destLocation: MessageLocation.Core,
    origLocation: currentMessengerLocation,
    payload,
    ...convertResponseFnToCodeAndId(responseCallbackFn),
  };
  routeInternally(message);
}

let onMessagePayloadFn;
export function onMessagePayload(fn: (payload: any, responseFn: IResponseFn) => void) {
  if (onMessagePayloadFn) throw new Error('onMessage has already been called');
  onMessagePayloadFn = fn;
}

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
  } else {
    throw new Error('Unknown destLocation');
  }
};

// INTERNAL VARIABLES //////////////////////////////////////////////////////////////////////////////

const pendingByResponseId: {
  [id: string]: {
    responseFn: IResponseFn;
    timeoutId: any;
  };
} = {};

// HELPERS ///////////////////////////////////////////////////////////////////////////

function handleIncomingLocalMessage(message: IMessageObject) {
  const needsResponse = messageExpectsResponse(message);
  const responseFn = needsResponse ? response => sendResponseBack(message, response) : undefined;
  onMessagePayloadFn(message.payload, responseFn);
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
    origLocation: MessageLocation.Core,
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
