import TypeSerializer from '@ulixee/commons/lib/TypeSerializer';
import { concatAsBuffer } from '@ulixee/commons/lib/bufferUtils';
import { sha256 } from '@ulixee/commons/lib/hashUtils';
import { toUrl } from '@ulixee/commons/lib/utils';
import Identity from '@ulixee/crypto/lib/Identity';
import { ConnectionToCore, WsTransportToCore } from '@ulixee/net';
import ICoreEventPayload from '@ulixee/net/interfaces/ICoreEventPayload';
import { IPayment } from '@ulixee/platform-specification';
import DatastoreApiSchemas, {
  IDatastoreApiTypes,
  IDatastoreApis,
} from '@ulixee/platform-specification/datastore';
import ValidationError from '@ulixee/specification/utils/ValidationError';
import * as Http from 'http';
import * as Https from 'https';
import { nanoid } from 'nanoid';
import IDatastoreDomainResponse from '../interfaces/IDatastoreDomainResponse';
import IDatastoreEvents from '../interfaces/IDatastoreEvents';
import IItemInputOutput from '../interfaces/IItemInputOutput';
import ITypes from '../types';
import installDatastoreSchema, { addDatastoreAlias } from '../types/installDatastoreSchema';
import CreditsTable from './CreditsTable';
import QueryLog from './QueryLog';
import ResultIterable from './ResultIterable';

export type IDatastoreExecResult = Omit<IDatastoreApiTypes['Datastore.query']['result'], 'outputs'>;
export type IDatastoreExecRelayArgs = Pick<
  IDatastoreApiTypes['Datastore.query']['args'],
  'authentication' | 'payment'
>;

export default class DatastoreApiClient {
  public connectionToCore: ConnectionToCore<IDatastoreApis, IDatastoreEvents>;
  public validateApiParameters = true;
  protected activeStreamByQueryId = new Map<string, ResultIterable<any, any>>();
  private options: { consoleLogErrors: boolean; storeQueryLog: boolean };
  private queryLog: QueryLog;

  constructor(host: string, options?: { consoleLogErrors?: boolean; storeQueryLog?: boolean }) {
    this.options = options ?? ({} as any);
    this.options.consoleLogErrors ??= false;
    this.options.storeQueryLog ??= process.env.NODE_ENV !== 'test';
    const url = toUrl(host);
    const transport = new WsTransportToCore(`ws://${url.host}/datastore`);
    this.connectionToCore = new ConnectionToCore(transport);
    this.connectionToCore.on('event', this.onEvent.bind(this));
    if (this.options.storeQueryLog) {
      this.queryLog = new QueryLog();
    }
  }

  public async disconnect(): Promise<void> {
    await Promise.all([this.queryLog?.close(), this.connectionToCore.disconnect()]);
  }

  public async getMeta(
    versionHash: string,
    includeSchemas = false,
  ): Promise<IDatastoreApiTypes['Datastore.meta']['result']> {
    return await this.runApi('Datastore.meta', {
      versionHash,
      includeSchemasAsJson: includeSchemas,
    });
  }

  public async getManifest(
    versionHash: string,
  ): Promise<IDatastoreApiTypes['Datastore.manifest']['result']> {
    return await this.runApi('Datastore.manifest', {
      versionHash,
    });
  }

  public async getExtractorPricing<
    IVersionHash extends keyof ITypes & string = any,
    IExtractorName extends keyof ITypes[IVersionHash]['extractors'] & string = 'default',
  >(
    versionHash: IVersionHash,
    extractorName: IExtractorName,
  ): Promise<
    Omit<
      IDatastoreApiTypes['Datastore.meta']['result']['extractorsByName'][IExtractorName],
      'name'
    > &
      Pick<IDatastoreApiTypes['Datastore.meta']['result'], 'computePricePerQuery'>
  > {
    const meta = await this.getMeta(versionHash);
    const stats = meta.extractorsByName[extractorName];

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

    if (meta.extractorsByName && meta.schemaInterface) {
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
    IItemName extends keyof ITypes[IVersionHash]['extractors'] & string = string,
    ISchemaDbx extends ITypes[IVersionHash]['extractors'][IItemName] = IO,
  >(
    versionHash: IVersionHash,
    name: IItemName,
    input: ISchemaDbx['input'],
    options?: {
      queryId?: string;
      payment?: IPayment & {
        onFinalized?(metadata: IDatastoreExecResult['metadata'], error?: Error): void;
      };
      authentication?: IDatastoreExecRelayArgs['authentication'];
      affiliateId?: string;
    },
  ): ResultIterable<ISchemaDbx['output'], IDatastoreApiTypes['Datastore.stream']['result']>;
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
      queryId?: string;
      payment?: IPayment & {
        onFinalized?(metadata: IDatastoreExecResult['metadata'], error?: Error): void;
      };
      authentication?: IDatastoreExecRelayArgs['authentication'];
      affiliateId?: string;
    } = {},
  ): ResultIterable<ISchemaDbx['output'], IDatastoreApiTypes['Datastore.stream']['result']> {
    const id = options?.queryId ?? nanoid(12);
    const startDate = new Date();
    const results = new ResultIterable<
      ISchemaDbx['output'],
      IDatastoreApiTypes['Datastore.stream']['result']
    >();
    this.activeStreamByQueryId.set(id, results);

    const onFinalized = options.payment?.onFinalized;
    const query = {
      versionHash,
      id,
      name,
      input,
      payment: options.payment,
      authentication: options.authentication,
      affiliateId: options.affiliateId,
    };

    void this.runApi('Datastore.stream', query)
      .then(result => {
        onFinalized?.(result.metadata);
        results.done(result);
        this.queryLog?.log(query, startDate, results.results, result.metadata);
        this.activeStreamByQueryId.delete(id);
        return null;
      })
      .catch(error => {
        onFinalized?.(null, error);
        this.queryLog?.log(query, startDate, null, null, error);
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
      queryId?: string;
      payment?: IPayment & {
        onFinalized?(metadata: IDatastoreExecResult['metadata'], error?: Error): void;
      };
      authentication?: IDatastoreExecRelayArgs['authentication'];
      affiliateId?: string;
    } = {},
  ): Promise<IDatastoreExecResult & { outputs?: ISchemaOutput[] }> {
    const startDate = new Date();
    const id = options.queryId ?? nanoid(12);
    const query = {
      id,
      versionHash,
      sql,
      boundValues: options.boundValues ?? [],
      payment: options.payment,
      authentication: options.authentication,
      affiliateId: options.affiliateId,
    };
    try {
      const result = await this.runApi('Datastore.query', query);
      if (options.payment?.onFinalized) {
        options.payment.onFinalized(result.metadata);
      }
      this.queryLog?.log(query, startDate, result.outputs, result.metadata);
      return result;
    } catch (error) {
      if (options.payment?.onFinalized) {
        options.payment.onFinalized(null, error);
      }
      this.queryLog?.log(query, startDate, null, null, error);
      throw error;
    }
  }

  public async upload(
    compressedDbx: Buffer,
    options: {
      allowNewLinkedVersionHistory?: boolean;
      timeoutMs?: number;
      identity?: Identity;
      forwardedSignature?: { adminIdentity: string; adminSignature: Buffer };
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
        compressedDbx,
        allowNewLinkedVersionHistory,
      );
      adminSignature = identity.sign(message);
    } else if (options.forwardedSignature) {
      ({ adminIdentity, adminSignature } = options.forwardedSignature);
    }

    const { success } = await this.runApi(
      'Datastore.upload',
      {
        compressedDbx,
        allowNewLinkedVersionHistory,
        adminSignature,
        adminIdentity,
      },
      timeoutMs,
    );
    return { success };
  }

  public async download(
    versionHash: string,
    options: {
      payment?: IPayment;
      timeoutMs?: number;
      identity?: Identity;
    } = {},
  ): Promise<IDatastoreApiTypes['Datastore.download']['result']> {
    options.timeoutMs ??= 120e3;
    const requestDate = new Date();
    const { timeoutMs, payment } = options;

    let adminSignature: Buffer;
    let adminIdentity: string;
    if (options.identity) {
      const identity = options.identity;
      adminIdentity = identity.bech32;
      const message = DatastoreApiClient.createDownloadSignatureMessage(
        versionHash,
        requestDate.getTime(),
      );
      adminSignature = identity.sign(message);
    }

    return await this.runApi(
      'Datastore.download',
      {
        versionHash,
        requestDate,
        adminSignature,
        adminIdentity,
        payment,
      },
      timeoutMs,
    );
  }

  public async startDatastore(dbxPath: string, watch = false): Promise<{ success: boolean }> {
    const { success } = await this.runApi('Datastore.start', {
      dbxPath,
      watch,
    });
    return { success };
  }

  public async getCreditsBalance(
    datastoreVersionHash: string,
    creditId: string,
  ): Promise<IDatastoreApiTypes['Datastore.creditsBalance']['result']> {
    return await this.runApi('Datastore.creditsBalance', {
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
      ownerType: 'datastore' | 'crawler' | 'extractor' | 'table';
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

    return await this.runApi('Datastore.admin', {
      versionHash: datastoreVersionHash,
      adminSignature,
      adminFunction,
      adminIdentity: adminIdentity.bech32,
      functionArgs,
    });
  }

  public request<T extends keyof IDatastoreApiTypes & string>(
    command: T,
    args: IDatastoreApiTypes[T]['args'],
    timeoutMs?: number,
  ): Promise<IDatastoreApiTypes[T]['result']> {
    return this.connectionToCore.sendRequest({ command, args: [args] as any }, timeoutMs);
  }

  protected onEvent<T extends keyof IDatastoreEvents>(
    event: ICoreEventPayload<IDatastoreEvents, T>,
  ): void {
    if (event.eventType === 'Stream.output') {
      const data = event.data as IDatastoreEvents['Stream.output'];
      this.activeStreamByQueryId.get(event.listenerId)?.push(data);
    }
  }

  protected async runApi<T extends keyof IDatastoreApiTypes & string>(
    command: T,
    args: IDatastoreApiTypes[T]['args'],
    timeoutMs?: number,
  ): Promise<IDatastoreApiTypes[T]['result']> {
    try {
      if (this.validateApiParameters) {
        args = await DatastoreApiSchemas[command].args.parseAsync(args);
      }
    } catch (error) {
      if (this.options.consoleLogErrors) {
        console.error('ERROR running Api', error, {
          command,
          args,
        });
      }
      throw ValidationError.fromZodValidation(
        `The API parameters for ${command} has some issues`,
        error,
      );
    }

    return await this.connectionToCore.sendRequest({ command, args: [args] as any }, timeoutMs);
  }

  public static resolveDatastoreDomain(domain: string): Promise<IDatastoreDomainResponse> {
    const isFullDomain = domain.match(/(?:.+:\/\/)?([^/]+)\/(dbx1[ac-hj-np-z02-9]{18})\/?/);
    if (isFullDomain) {
      const [, host, datastoreVersionHash] = isFullDomain;
      return Promise.resolve({ host, datastoreVersionHash });
    }

    if (!domain.includes('://')) domain = `http://${domain}`;
    const httpModule = domain.startsWith('https') ? Https : Http;
    return new Promise((resolve, reject) => {
      const url = new URL(domain);
      if (url.protocol !== 'https:') url.protocol = 'http:';
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
    return sha256(
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
    return sha256(
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
    compressedDbx: Buffer,
    allowNewLinkedVersionHistory: boolean,
  ): Buffer {
    return sha256(
      concatAsBuffer('Datastore.upload', compressedDbx, String(allowNewLinkedVersionHistory)),
    );
  }

  public static createDownloadSignatureMessage(versionHash: string, requestDate: number): Buffer {
    return sha256(concatAsBuffer('Datastore.download', versionHash, requestDate));
  }
}
