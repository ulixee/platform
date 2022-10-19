import IDataboxSchema from '@ulixee/databox-interfaces/IDataboxSchema';
import { IAnySchemaJson } from '@ulixee/schema/interfaces/ISchemaJson';

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
  schema?: Omit<IDataboxSchema, 'input' | 'output'> & {
    input?: Record<string, IAnySchemaJson>;
    output?: Record<string, IAnySchemaJson> | IAnySchemaJson;
  };
}

export type IResponseData = IExecResponseData | IFetchMetaResponseData;

export interface IResponse {
  responseId: string;
  data: IResponseData;
}
