export interface IFetchModuleMessage {
  messageId: string;
  action: 'fetchRuntime';
  scriptPath: string;
}

export interface IRunMessage {
  messageId: string;
  action: 'run';
  scriptPath: string;
  input: any;
}

export type IMessage = IFetchModuleMessage | IRunMessage;

export interface IRunResponseData {
  output: any;
}

export interface IFetchRuntimeResponseData {
  name: string;
  version: string;
}

export type IResponseData = IRunResponseData | IFetchRuntimeResponseData;

export interface IResponse {
  responseId: string;
  data: IResponseData;
}

