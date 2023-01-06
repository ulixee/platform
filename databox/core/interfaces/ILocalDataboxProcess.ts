import IDataboxMetadata from '@ulixee/databox/interfaces/IDataboxMetadata';

export interface IFetchMetaMessage {
  messageId: string;
  action: 'fetchMeta';
  scriptPath: string;
}

export interface IRunMessage {
  messageId: string;
  action: 'stream';
  functionName: string;
  scriptPath: string;
  input: any;
  streamId: number;
}

export type IMessage = IFetchMetaMessage | IRunMessage;

export interface IExecResponseData {
  outputs?: any[];
  error?: { message: string; stack?: string };
}

export interface IFetchMetaResponseData extends IDataboxMetadata {
  tableSeedlingsByName: {
    [name: string]: Record<string, any>;
  };
}

export type IResponseData = IExecResponseData | IFetchMetaResponseData;

export interface IResponse {
  responseId: string;
  streamId?: number;
  data: IResponseData;
}
