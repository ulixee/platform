export interface IFetchModuleMessage {
  messageId: string;
  action: 'fetchModule';
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

export interface IFetchMeduleResponseData {
  module: string;
}

export type IResponseData = IRunResponseData | IFetchMeduleResponseData;

export interface IResponse {
  responseId: string;
  data: IResponseData;
}

