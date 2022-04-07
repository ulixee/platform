import { nanoid } from 'nanoid';

/* Packed messages start with a colon and have two fixed length fields followed by one variable field:
  - colon (length: 1)
  - destLocation (length: 20)
  - colon (length: 1)
  - responseCode (length: 1)
  - colon (length: 1)
  - stringifiedMessage (length: ?)
 */

const fieldDivider = ':';

const lengthOfDestLocationField = 20;
const lengthOfFieldDivider = fieldDivider.length;
const lengthOfResponseCodeField = 1;

const startOfDestLocationField = 1;
const startOfResponseCodeField =
  startOfDestLocationField + lengthOfDestLocationField + lengthOfFieldDivider;
const startOfStringifiedMessageField =
  startOfResponseCodeField + lengthOfResponseCodeField + lengthOfFieldDivider;

export enum MessageEventType {
  OpenSelectorGeneratorPanel = 'OpenSelectorGeneratorPanel',
  CloseElementOptionsOverlay = 'CloseElementOptionsOverlay',
  InspectElementModeChanged = 'InspectElementModeChanged',
  OpenElementOptionsOverlay = 'OpenElementOptionsOverlay',
  HideElementOptionsOverlay = 'HideElementOptionsOverlay',
  RemoveHideFromElementOptionsOverlay = 'RemoveHideFromElementOptionsOverlay',
  ContentScriptNeedsElement = 'ContentScriptNeedsElement',
  RunSelectorGenerator = 'RunSelectorGenerator',
  ResetSelectorGenerator = 'ResetSelectorGenerator',
  AddIncludedElement = 'AddIncludedElement',
  RemoveIncludedElement = 'RemoveIncludedElement',
  AddExcludedElement = 'AddExcludedElement',
  RemoveExcludedElement = 'RemoveExcludedElement',
  FinishedSelectorGeneration = 'FinishedSelectorGeneration',
  UpdateElementOptions = 'UpdateElementOptions',
  CloseDevtoolsPanel = 'CloseDevtoolsPanel',
  ToggleInspectElementMode = 'ToggleInspectElementMode',
  UndockedFocusChange = 'UndockedFocusChange',
}

export type IMessageEventType = keyof typeof MessageEventType;

export enum MessageLocation {
  DevtoolsPrivate = 'DevtoolsPrivate',
  DevtoolsScript = 'DevtoolsScript',
  BackgroundScript = 'BackgroundScript',
  ContentScript = 'ContentScript',
  Core = 'Core',
}

export type IMessageLocation = keyof typeof MessageLocation;

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ___sendToCore = '___sendToCore';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ___receiveFromCore = '___receiveFromCore';

export const sendMessageFromBrowserToCoreFnName = 'sendMessageFromBrowserToUlixeeCore';
export const eventEmitterNameInBrowser = 'eventEmitterFromUlixeeCore';

export enum ResponseCode {
  Y = 'Y',
  N = 'N',
  R = 'R',
}

export type IResponseCode = keyof typeof ResponseCode;

export interface IMessageObject {
  destLocation: IMessageLocation;
  origLocation: IMessageLocation;
  origTabId?: number;
  responseCode: IResponseCode;
  responseId?: string;
  payload: any;
}

export type IRestOfMessageObject = Omit<IMessageObject, 'destLocation' | 'responseCode'>;

export function createResponseId(): string {
  return nanoid();
}

export function packMessage(message: IMessageObject | string): string {
  if (typeof message === 'string') {
    if (isPackedMessage(message)) return message;
    throw new Error('Unknown message format');
  }
  const { destLocation } = message;
  const responseCode = message.responseCode || ResponseCode.N;
  const messageToStringify = { ...message };
  delete messageToStringify.destLocation;
  delete messageToStringify.responseCode;
  const stringifiedMessage = JSON.stringify(messageToStringify);
  return `:${destLocation.padEnd(lengthOfDestLocationField)}:${responseCode}:${stringifiedMessage}`;
}

function isPackedMessage(message: string): boolean {
  return message.substr(0, 1) === fieldDivider;
}

export function messageExpectsResponse(message: IMessageObject | string): boolean {
  if (typeof message === 'string') {
    if (isPackedMessage(message)) {
      const responseCode = message.substr(startOfResponseCodeField, lengthOfResponseCodeField);
      return responseCode === ResponseCode.Y;
    }
    throw new Error('Unknown message format');
  }
  return message.responseCode === ResponseCode.Y;
}

export function isResponseMessage(message: IMessageObject | string): boolean {
  if (typeof message === 'string') {
    if (isPackedMessage(message)) {
      const responseCode = message.substr(startOfResponseCodeField, lengthOfResponseCodeField);
      return responseCode === ResponseCode.R;
    }
    throw new Error('Unknown message format');
  }
  return message.responseCode === ResponseCode.R;
}

export function extractStringifiedComponentsFromMessage(
  message: IMessageObject | string,
): [destLocation: string, responseCode: keyof typeof ResponseCode, stringifiedMessage: string] {
  if (typeof message === 'string' && isPackedMessage(message)) {
    const destLocation = message.substr(startOfDestLocationField, lengthOfDestLocationField);
    const responseCode = message.substr(startOfResponseCodeField, lengthOfResponseCodeField);
    const stringifiedMessage = message.substr(startOfStringifiedMessageField);
    return [destLocation.trim(), responseCode as any, stringifiedMessage];
  }
  if (typeof message === 'string') throw new Error('Unknown message format');

  const { destLocation, responseCode, ...messageToStringify } = message;
  const stringifiedMessage = JSON.stringify(messageToStringify);
  return [destLocation, responseCode || ResponseCode.N, stringifiedMessage];
}

export function extractResponseIdFromMessage(message: IMessageObject | string): string {
  if (typeof message === 'string' && isPackedMessage(message)) {
    const stringifiedMessage = message.substr(startOfStringifiedMessageField);
    return JSON.parse(stringifiedMessage).responseId as string;
  }
  if (typeof message === 'string') {
    // must be stringifiedMessage
    return JSON.parse(message).responseId as string;
  }
  return message.responseId;
}
