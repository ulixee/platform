import IFunctionSchema from '@ulixee/databox/interfaces/IFunctionSchema';
import { IPassthroughFunctionComponents } from '@ulixee/databox/lib/PassthroughFunction';
import { IAnySchemaJson } from '@ulixee/schema/interfaces/ISchemaJson';
import { IFunctionComponents } from '@ulixee/databox';

export interface IFetchMetaMessage {
  messageId: string;
  action: 'fetchMeta';
  scriptPath: string;
}

export interface IRunMessage {
  messageId: string;
  action: 'exec';
  functionName: string;
  scriptPath: string;
  input: any;
}

export type IMessage = IFetchMetaMessage | IRunMessage;

export interface IExecResponseData {
  output?: any;
  error?: { message: string; stack?: string };
}

export interface IFetchMetaResponseData {
  coreVersion: string;
  remoteDataboxes?: Record<string, string>;
  paymentAddress?: string;
  giftCardIssuerIdentity?: string;
  functionsByName: {
    [name: string]: {
      corePlugins: { [name: string]: string };
      schema?: Omit<IFunctionSchema, 'input' | 'output'> & {
        input?: Record<string, IAnySchemaJson>;
        output?: Record<string, IAnySchemaJson> | IAnySchemaJson;
      };
    } & Omit<IFunctionComponents<any, any>, 'schema'> &
      IPassthroughFunctionComponents<any, any>;
  };
  tablesByName: {
    [name: string]: {
      schema: Record<string, IAnySchemaJson>;
      seedlings: Record<string, any>;
    }
  }
}

export type IResponseData = IExecResponseData | IFetchMetaResponseData;

export interface IResponse {
  responseId: string;
  data: IResponseData;
}
