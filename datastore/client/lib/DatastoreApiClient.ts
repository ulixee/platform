import { ConnectionToCore, WsTransportToCore } from '@ulixee/net';
import DatastoreApiSchemas, {
  IDatastoreApis,
  IDatastoreApiTypes,
} from '@ulixee/specification/datastore';
import { sha3 } from '@ulixee/commons/lib/hashUtils';
import { concatAsBuffer } from '@ulixee/commons/lib/bufferUtils';
import Identity from '@ulixee/crypto/lib/Identity';
import ValidationError from '@ulixee/specification/utils/ValidationError';
import { IPayment } from '@ulixee/specification';
import { nanoid } from 'nanoid';
import ICoreEventPayload from '@ulixee/net/interfaces/ICoreEventPayload';
import ITypes from '../types';
import installSchemaType, { addSchemaAlias } from '../types/installSchemaType';
import IFunctionInputOutput from '../interfaces/IFunctionInputOutput';
import ResultIterable from './ResultIterable';
import IDatastoreEvents from '../interfaces/IDatastoreEvents';

export type IDatastoreExecResult = Omit<IDatastoreApiTypes['Datastore.query']['result'], 'outputs'>;
export type IDatastoreExecRelayArgs = Pick<
  IDatastoreApiTypes['Datastore.query']['args'],
  'authentication' | 'payment'
>;

export default class DatastoreApiClient {
  public connectionToCore: ConnectionToCore<IDatastoreApis, IDatastoreEvents>;
  public validateApiParameters = true;
  protected activeIterableByStreamId = new Map<string, ResultIterable<any, any>>();

  constructor(host: string) {
    if (host.startsWith('ulx://')) {
      host = `ws://${host.slice('ulx://'.length)}`;
    }
    const transport = new WsTransportToCore(`${host}/datastore`);
    this.connectionToCore = new ConnectionToCore(transport);
    this.connectionToCore.on('event', this.onEvent.bind(this));
  }

  public disconnect(): Promise<void> {
    return this.connectionToCore.disconnect();
  }

  public async getMeta(
    versionHash: string,
  ): Promise<IDatastoreApiTypes['Datastore.meta']['result']> {
    return await this.runRemote('Datastore.meta', { versionHash });
  }

  public async getFunctionPricing<
    IVersionHash extends keyof ITypes & string = any,
    IFunctionName extends keyof ITypes[IVersionHash] & string = 'default',
  >(
    versionHash: IVersionHash,
    functionName: IFunctionName,
  ): Promise<
    Omit<IDatastoreApiTypes['Datastore.meta']['result']['functionsByName'][IFunctionName], 'name'> &
      Pick<
        IDatastoreApiTypes['Datastore.meta']['result'],
        'computePricePerQuery' | 'giftCardIssuerIdentities'
      >
  > {
    const meta = await this.getMeta(versionHash);
    const stats = meta.functionsByName[functionName];

    return {
      ...stats,
      computePricePerQuery: meta.computePricePerQuery,
      giftCardIssuerIdentities: meta.giftCardIssuerIdentities,
    };
  }

  public async install(
    versionHash: string,
    alias?: string,
  ): Promise<IDatastoreApiTypes['Datastore.meta']['result']> {
    const meta = await this.getMeta(versionHash);

    if (meta.functionsByName && meta.schemaInterface) {
      installSchemaType(meta.schemaInterface, versionHash);
    }
    if (alias) {
      addSchemaAlias(versionHash, alias);
    }

    return meta;
  }

  /**
   * NOTE: any caller must handle tracking local balances of gift cards and removing them if they're depleted!
   */
  public stream<
    IO extends IFunctionInputOutput,
    IVersionHash extends keyof ITypes & string = any,
    IFunctionName extends keyof ITypes[IVersionHash] & string = 'default',
    ISchemaDbx extends ITypes[IVersionHash][IFunctionName] = IO,
  >(
    versionHash: IVersionHash,
    functionName: IFunctionName,
    input: ISchemaDbx['input'],
    options: {
      payment?: IPayment & {
        onFinalized?(metadata: IDatastoreExecResult['metadata'], error?: Error): void;
      };
      authentication?: IDatastoreExecRelayArgs['authentication'];
    } = {},
  ): ResultIterable<ISchemaDbx['output'], IDatastoreApiTypes['Datastore.stream']['result']> {
    const streamId = nanoid(12);
    const results = new ResultIterable<
      ISchemaDbx['output'],
      IDatastoreApiTypes['Datastore.stream']['result']
    >();
    this.activeIterableByStreamId.set(streamId, results);

    const onFinalized = options.payment?.onFinalized;

    void this.runRemote('Datastore.stream', {
      versionHash,
      streamId,
      functionName,
      input,
      payment: options.payment,
      authentication: options.authentication,
    })
      .then(result => {
        onFinalized?.(result.metadata);
        results.done(result);
        this.activeIterableByStreamId.delete(streamId);
        return null;
      })
      .catch(error => {
        onFinalized?.(null, error);
        results.reject(error);
      });

    return results;
  }

  /**
   * NOTE: any caller must handle tracking local balances of gift cards and removing them if they're depleted!
   */
  public async query<ISchemaOutput = any, IVersionHash extends keyof ITypes & string = any>(
    versionHash: IVersionHash,
    sql: string,
    options: {
      boundValues?: any[];
      payment?: IPayment & {
        onFinalized?(metadata: IDatastoreExecResult['metadata'], error?: Error): void;
      };
      authentication?: IDatastoreExecRelayArgs['authentication'];
    } = {},
  ): Promise<IDatastoreExecResult & { outputs?: ISchemaOutput[] }> {
    try {
      const result = await this.runRemote('Datastore.query', {
        versionHash,
        sql,
        boundValues: options.boundValues ?? [],
        payment: options.payment,
        authentication: options.authentication,
      });
      if (options.payment?.onFinalized) {
        options.payment.onFinalized(result.metadata);
      }
      return result;
    } catch (error) {
      if (options.payment?.onFinalized) {
        options.payment.onFinalized(null, error);
      }
      throw error;
    }
  }

  public async upload(
    compressedDatastore: Buffer,
    options: {
      allowNewLinkedVersionHistory?: boolean;
      timeoutMs?: number;
      identity?: Identity;
    } = {},
  ): Promise<{ success: boolean }> {
    options.allowNewLinkedVersionHistory ??= false;
    options.timeoutMs ??= 120e3;
    const { allowNewLinkedVersionHistory, timeoutMs } = options;

    let uploaderSignature: Buffer;
    let uploaderIdentity: string;
    if (options.identity) {
      const identity = options.identity;
      uploaderIdentity = identity.bech32;
      const message = DatastoreApiClient.createUploadSignatureMessage(
        compressedDatastore,
        allowNewLinkedVersionHistory,
      );
      uploaderSignature = identity.sign(message);
    }

    return await this.runRemote(
      'Datastore.upload',
      {
        compressedDatastore,
        allowNewLinkedVersionHistory,
        uploaderSignature,
        uploaderIdentity,
      },
      timeoutMs,
    );
  }

  protected onEvent<T extends keyof IDatastoreEvents>(
    event: ICoreEventPayload<IDatastoreEvents, T>,
  ): void {
    if (event.eventType === 'FunctionStream.output') {
      const data = event.data as IDatastoreEvents['FunctionStream.output'];
      this.activeIterableByStreamId.get(event.listenerId)?.push(data);
    }
  }

  protected async runRemote<T extends keyof IDatastoreApiTypes & string>(
    command: T,
    args: IDatastoreApiTypes[T]['args'],
    timeoutMs?: number,
  ): Promise<IDatastoreApiTypes[T]['result']> {
    try {
      if (this.validateApiParameters) {
        args = await DatastoreApiSchemas[command].args.parseAsync(args);
      }
    } catch (error) {
      throw ValidationError.fromZodValidation(
        `The API parameters for ${command} have some issues`,
        error,
      );
    }

    return await this.connectionToCore.sendRequest({ command, args: [args] as any }, timeoutMs);
  }

  public static createExecSignatureMessage(payment: IPayment, nonce: string): Buffer {
    return sha3(
      concatAsBuffer(
        'Datastore.exec',
        payment?.giftCard?.id,
        payment?.micronote?.micronoteId,
        nonce,
      ),
    );
  }

  public static createExecAuthentication(
    payment: IPayment,
    authenticationIdentity: Identity,
    nonce?: string,
  ): IDatastoreExecRelayArgs['authentication'] {
    nonce ??= nanoid(10);
    const message = DatastoreApiClient.createExecSignatureMessage(payment, nonce);
    return {
      identity: authenticationIdentity.bech32,
      signature: authenticationIdentity.sign(message),
      nonce,
    };
  }

  public static createUploadSignatureMessage(
    compressedDatastore: Buffer,
    allowNewLinkedVersionHistory: boolean,
  ): Buffer {
    return sha3(
      concatAsBuffer('Datastore.upload', compressedDatastore, String(allowNewLinkedVersionHistory)),
    );
  }
}
