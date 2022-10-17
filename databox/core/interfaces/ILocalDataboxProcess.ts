export interface IFetchMetaMessage {
  messageId: string;
  action: 'fetchMeta';
  scriptPath: string;
}

export interface IRunMessage {
  messageId: string;
  action: 'exec';
  scriptPath: string;
  input: any;
}

export type IMessage = IFetchMetaMessage | IRunMessage;

export interface IExecResponseData {
  output: any;
}

export interface IFetchMetaResponseData {
  coreVersion: string;
  corePlugins: { [name: string]: string };
}

export type IResponseData = IExecResponseData | IFetchMetaResponseData;

export interface IResponse {
  responseId: string;
  data: IResponseData;
}

