import IDatastoreMetadata from '@ulixee/datastore/interfaces/IDatastoreMetadata';

export interface IFetchMetaMessage {
  messageId: string;
  action: 'fetchMeta';
  scriptPath: string;
}

export interface IRunMessage {
  messageId: string;
  action: 'run';
  functionName: string;
  scriptPath: string;
  input: any;
  streamId: number;
}

export type IMessage = IFetchMetaMessage | IRunMessage;

export interface IExecResponseData {
  outputs?: any[];
}

export interface IFetchMetaResponseData extends IDatastoreMetadata {
  tableSeedlingsByName: {
    [name: string]: Record<string, any>;
  };
}

export type IResponseData = IExecResponseData | IFetchMetaResponseData;

export interface IResponse {
  responseId: string;
  streamId?: number;
  data: IResponseData | Error;
}
