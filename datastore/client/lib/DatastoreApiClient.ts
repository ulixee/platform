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
import TypeSerializer from '@ulixee/commons/lib/TypeSerializer';
import * as Http from 'http';
import * as Https from 'https';
import ITypes from '../types';
import installDatastoreSchema, { addDatastoreAlias } from '../types/installDatastoreSchema';
import IItemInputOutput from '../interfaces/IItemInputOutput';
import ResultIterable from './ResultIterable';
import IDatastoreEvents from '../interfaces/IDatastoreEvents';
import CreditsTable from './CreditsTable';
import IDatastoreDomainResponse from '../interfaces/IDatastoreDomainResponse';

export type IDatastoreExecResult = Omit<IDatastoreApiTypes['Datastore.query']['result'], 'outputs'>;
export type IDatastoreExecRelayArgs = Pick<
  IDatastoreApiTypes['Datastore.query']['args'],
  'authentication' | 'payment'
>;

export default class DatastoreApiClient {
  public connectionToCore: ConnectionToCore<IDatastoreApis, IDatastoreEvents>;
  public validateApiParameters = true;
  protected activeIterableByStreamId = new Map<string, ResultIterable<any, any>>();

  constructor(host: string, private logErrors: boolean = false) {
    if (!host.includes('://')) host = `ulx://${host}`;
    const url = new URL(host);
    const transport = new WsTransportToCore(`ws://${url.host}/datastore`);
    this.connectionToCore = new ConnectionToCore(transport);
    this.connectionToCore.on('event', this.onEvent.bind(this));
  }

  public disconnect(): Promise<void> {
    return this.connectionToCore.disconnect();
  }

  public async getMeta(
    versionHash: string,
    includeSchemas = false,
  ): Promise<IDatastoreApiTypes['Datastore.meta']['result']> {
    return await this.runRemote('Datastore.meta', {
      versionHash,
      includeSchemasAsJson: includeSchemas,
    });
  }

  public async getFunctionPricing<
    IVersionHash extends keyof ITypes & string = any,
    IFunctionName extends keyof ITypes[IVersionHash]['functions'] & string = 'default',
  >(
    versionHash: IVersionHash,
    functionName: IFunctionName,
  ): Promise<
    Omit<IDatastoreApiTypes['Datastore.meta']['result']['functionsByName'][IFunctionName], 'name'> &
      Pick<IDatastoreApiTypes['Datastore.meta']['result'], 'computePricePerQuery'>
  > {
    const meta = await this.getMeta(versionHash);
    const stats = meta.functionsByName[functionName];

    return {
      ...stats,
      computePricePerQuery: meta.computePricePerQuery,
    };
  }

  public async install(
    versionHash: string,
    alias?: string,
  ): Promise<IDatastoreApiTypes['Datastore.meta']['result']> {
    const meta = await this.getMeta(versionHash);

    if (meta.functionsByName && meta.schemaInterface) {
      installDatastoreSchema(meta.schemaInterface, versionHash);
    }
    if (alias) {
      addDatastoreAlias(versionHash, alias);
    }

    return meta;
  }

  /**
   * NOTE: any caller must handle tracking local balances of Credits and removing them if they're depleted!
   */
  public stream<
    IO extends IItemInputOutput,
    IVersionHash extends keyof ITypes & string = any,
    IItemName extends keyof ITypes[IVersionHash]['functions'] & string = string,
    ISchemaDbx extends ITypes[IVersionHash]['functions'][IItemName] = IO,
  >(
    versionHash: IVersionHash,
    name: IItemName,
    input: ISchemaDbx['input'],
    options?: {
      payment?: IPayment & {
        onFinalized?(metadata: IDatastoreExecResult['metadata'], error?: Error): void;
      };
      authentication?: IDatastoreExecRelayArgs['authentication'];
      affiliateId?: string;
    },
  ): ResultIterable<ISchemaDbx['output'], IDatastoreApiTypes['Datastore.stream']['result']>
  public stream<
    IO extends IItemInputOutput,
    IVersionHash extends keyof ITypes & string = any,
    IItemName extends keyof ITypes[IVersionHash]['tables'] & string = string,
    ISchemaDbx extends ITypes[IVersionHash]['tables'][IItemName] = IO,
  >(
    versionHash: IVersionHash,
    name: IItemName,
    input: ISchemaDbx['input'],
    options: {
      payment?: IPayment & {
        onFinalized?(metadata: IDatastoreExecResult['metadata'], error?: Error): void;
      };
      authentication?: IDatastoreExecRelayArgs['authentication'];
      affiliateId?: string;
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
      name,
      input,
      payment: options.payment,
      authentication: options.authentication,
      affiliateId: options.affiliateId,
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
   * NOTE: any caller must handle tracking local balances of Credits and removing them if they're depleted!
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
      affiliateId?: string;
    } = {},
  ): Promise<IDatastoreExecResult & { outputs?: ISchemaOutput[] }> {
    try {
      const result = await this.runRemote('Datastore.query', {
        versionHash,
        sql,
        boundValues: options.boundValues ?? [],
        payment: options.payment,
        authentication: options.authentication,
        affiliateId: options.affiliateId,
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

    let adminSignature: Buffer;
    let adminIdentity: string;
    if (options.identity) {
      const identity = options.identity;
      adminIdentity = identity.bech32;
      const message = DatastoreApiClient.createUploadSignatureMessage(
        compressedDatastore,
        allowNewLinkedVersionHistory,
      );
      adminSignature = identity.sign(message);
    }

    return await this.runRemote(
      'Datastore.upload',
      {
        compressedDatastore,
        allowNewLinkedVersionHistory,
        adminSignature,
        adminIdentity,
      },
      timeoutMs,
    );
  }

  public async getCreditsBalance(
    datastoreVersionHash: string,
    creditId: string,
  ): Promise<IDatastoreApiTypes['Datastore.creditsBalance']['result']> {
    return await this.runRemote('Datastore.creditsBalance', {
      datastoreVersionHash,
      creditId,
    });
  }

  public async createCredits(
    datastoreVersionHash: string,
    microgons: number,
    adminIdentity: Identity,
  ): Promise<{ id: string; remainingCredits: number; secret: string }> {
    return await this.administer<ReturnType<CreditsTable['create']>>(
      datastoreVersionHash,
      adminIdentity,
      {
        ownerType: 'table',
        ownerName: CreditsTable.tableName,
        functionName: 'create',
      },
      [microgons],
    );
  }

  public async administer<T>(
    datastoreVersionHash: string,
    adminIdentity: Identity,
    adminFunction: {
      ownerType: 'datastore' | 'crawler' | 'function' | 'table';
      ownerName: string;
      functionName: string;
    },
    functionArgs: any[],
  ): Promise<T> {
    const message = DatastoreApiClient.createAdminFunctionMessage(
      adminIdentity.bech32,
      adminFunction.ownerType,
      adminFunction.ownerName,
      adminFunction.functionName,
      functionArgs,
    );
    const adminSignature = adminIdentity.sign(message);

    return await this.runRemote('Datastore.admin', {
      versionHash: datastoreVersionHash,
      adminSignature,
      adminFunction,
      adminIdentity: adminIdentity.bech32,
      functionArgs,
    });
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
      if (this.logErrors) {
        console.error('ERROR running Api', error, {
          command,
          args,
        });
      }
      console.log(error);
      throw ValidationError.fromZodValidation(
        `The API parameters for ${command} has some issues`,
        error,
      );
    }

    return await this.connectionToCore.sendRequest({ command, args: [args] as any }, timeoutMs);
  }

  public static resolveDatastoreDomain(domain: string): Promise<IDatastoreDomainResponse> {
    const isFullDomain = domain.match(/(?:.+:\/\/)?([^/]+)\/datastore\/(dbx1[ac-hj-np-z02-9]{18})/);
    if (isFullDomain) {
      const [, host, datastoreVersionHash] = isFullDomain;
      return Promise.resolve({ host, datastoreVersionHash });
    }

    if (!domain.includes('://')) domain = `http://${domain}`;
    const httpModule = domain.startsWith('https') ? Https : Http;
    return new Promise((resolve, reject) => {
      const url = new URL(domain);
      const request = httpModule.request(url.origin, { method: 'OPTIONS' }, async res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          resolve(this.resolveDatastoreDomain(res.headers.location));
          return;
        }

        res.on('error', reject);
        res.setEncoding('utf8');
        let result = '';
        for await (const chunk of res) {
          result += chunk;
        }

        const resultObject = TypeSerializer.parse(result);
        if (resultObject instanceof Error) reject(resultObject);
        resolve(resultObject);
      });
      request.on('error', reject);
      request.end();
    });
  }

  public static createExecSignatureMessage(payment: IPayment, nonce: string): Buffer {
    return sha3(
      concatAsBuffer(
        'Datastore.exec',
        payment?.credits?.id,
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

  public static createAdminFunctionMessage(
    adminIdentity: string,
    ownerType: string,
    ownerName: string,
    functionName: string,
    args: any[],
  ): Buffer {
    return sha3(
      concatAsBuffer(
        'Datastore.admin',
        adminIdentity,
        ownerType,
        ownerName,
        functionName,
        TypeSerializer.stringify(args, { sortKeys: true }),
      ),
    );
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
