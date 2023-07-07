import { concatAsBuffer } from '@ulixee/commons/lib/bufferUtils';
import { sha256 } from '@ulixee/commons/lib/hashUtils';
import TypeSerializer from '@ulixee/commons/lib/TypeSerializer';
import { toUrl } from '@ulixee/commons/lib/utils';
import Identity from '@ulixee/crypto/lib/Identity';
import { ConnectionToCore, WsTransportToCore } from '@ulixee/net';
import ICoreEventPayload from '@ulixee/net/interfaces/ICoreEventPayload';
import { IPayment } from '@ulixee/platform-specification';
import DatastoreApiSchemas, {
  IDatastoreApis,
  IDatastoreApiTypes,
} from '@ulixee/platform-specification/datastore';
import { datastoreRegex } from '@ulixee/platform-specification/types/datastoreIdValidation';
import { semverRegex } from '@ulixee/platform-specification/types/semverValidation';
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
    id: string,
    version: string,
    includeSchemas = false,
  ): Promise<IDatastoreApiTypes['Datastore.meta']['result']> {
    return await this.runApi('Datastore.meta', {
      id,
      version,
      includeSchemasAsJson: includeSchemas,
    });
  }

  public async getExtractorPricing<
    IVersion extends keyof ITypes & string = any,
    IExtractorName extends keyof ITypes[IVersion]['extractors'] & string = 'default',
  >(
    id: string,
    version: IVersion,
    extractorName: IExtractorName,
  ): Promise<
    Omit<
      IDatastoreApiTypes['Datastore.meta']['result']['extractorsByName'][IExtractorName],
      'name'
    > &
      Pick<IDatastoreApiTypes['Datastore.meta']['result'], 'computePricePerQuery'>
  > {
    const meta = await this.getMeta(id, version);
    const stats = meta.extractorsByName[extractorName];

    return {
      ...stats,
      computePricePerQuery: meta.computePricePerQuery,
    };
  }

  public async install(
    id: string,
    version: string,
    alias?: string,
  ): Promise<IDatastoreApiTypes['Datastore.meta']['result']> {
    const meta = await this.getMeta(id, version);

    if (meta.extractorsByName && meta.schemaInterface) {
      installDatastoreSchema(meta.schemaInterface, id, version);
    }
    if (alias) {
      addDatastoreAlias(alias, id, version);
    }

    return meta;
  }

  /**
   * NOTE: any caller must handle tracking local balances of Credits and removing them if they're depleted!
   */
  public stream<
    IO extends IItemInputOutput,
    IVersion extends keyof ITypes & string = any,
    IItemName extends keyof ITypes[IVersion]['extractors'] & string = string,
    ISchemaDbx extends ITypes[IVersion]['extractors'][IItemName] = IO,
  >(
    id: string,
    version: IVersion,
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
    IVersion extends keyof ITypes & string = any,
    IItemName extends keyof ITypes[IVersion]['tables'] & string = string,
    ISchemaDbx extends ITypes[IVersion]['tables'][IItemName] = IO,
  >(
    id: string,
    version: IVersion,
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
    const queryId = options?.queryId ?? nanoid(12);
    const startDate = new Date();
    const results = new ResultIterable<
      ISchemaDbx['output'],
      IDatastoreApiTypes['Datastore.stream']['result']
    >();
    this.activeStreamByQueryId.set(id, results);

    const onFinalized = options.payment?.onFinalized;
    const query = {
      id,
      version,
      queryId,
      name,
      input,
      payment: options.payment,
      authentication: options.authentication,
      affiliateId: options.affiliateId,
    };

    const host = this.connectionToCore.transport.host;
    const hostIdentity = null; // TODO: exchange identity
    void this.runApi('Datastore.stream', query)
      .then(result => {
        onFinalized?.(result.metadata);
        results.done(result);
        this.queryLog?.log(query, startDate, results.results, result.metadata, host, hostIdentity);
        this.activeStreamByQueryId.delete(id);
        return null;
      })
      .catch(error => {
        onFinalized?.(null, error);
        this.queryLog?.log(query, startDate, null, null, host, hostIdentity, error);
        results.reject(error);
      });

    return results;
  }

  /**
   * NOTE: any caller must handle tracking local balances of Credits and removing them if they're depleted!
   */
  public async query<ISchemaOutput = any, IVersion extends keyof ITypes & string = any>(
    id: string,
    version: IVersion,
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
    const queryId = options.queryId ?? nanoid(12);
    const query = {
      id,
      queryId,
      version,
      sql,
      boundValues: options.boundValues ?? [],
      payment: options.payment,
      authentication: options.authentication,
      affiliateId: options.affiliateId,
    };
    const host = this.connectionToCore.transport.host;
    const hostIdentity = null; // TODO: exchange identity
    try {
      const result = await this.runApi('Datastore.query', query);
      if (options.payment?.onFinalized) {
        options.payment.onFinalized(result.metadata);
      }
      this.queryLog?.log(query, startDate, result.outputs, result.metadata, host, hostIdentity);
      return result;
    } catch (error) {
      if (options.payment?.onFinalized) {
        options.payment.onFinalized(null, error);
      }
      this.queryLog?.log(query, startDate, null, null, host, hostIdentity, error);
      throw error;
    }
  }

  public async upload(
    compressedDbx: Buffer,
    options: {
      timeoutMs?: number;
      identity?: Identity;
      forwardedSignature?: { adminIdentity: string; adminSignature: Buffer };
    } = {},
  ): Promise<{ success: boolean }> {
    options.timeoutMs ??= 120e3;
    const { timeoutMs } = options;

    let adminSignature: Buffer;
    let adminIdentity: string;
    if (options.identity) {
      const identity = options.identity;
      adminIdentity = identity.bech32;
      const message = DatastoreApiClient.createUploadSignatureMessage(compressedDbx);
      adminSignature = identity.sign(message);
    } else if (options.forwardedSignature) {
      ({ adminIdentity, adminSignature } = options.forwardedSignature);
    }

    const { success } = await this.runApi(
      'Datastore.upload',
      {
        compressedDbx,
        adminSignature,
        adminIdentity,
      },
      timeoutMs,
    );
    return { success };
  }

  public async download(
    id: string,
    version: string,
    identity: Identity,
    options: {
      timeoutMs?: number;
    } = {},
  ): Promise<IDatastoreApiTypes['Datastore.download']['result']> {
    options.timeoutMs ??= 120e3;
    const requestDate = new Date();
    const { timeoutMs } = options;

    const adminIdentity = identity.bech32;
    const message = DatastoreApiClient.createDownloadSignatureMessage(
      id,
      version,
      requestDate.getTime(),
    );
    const adminSignature = identity.sign(message);

    return await this.runApi(
      'Datastore.download',
      {
        id,
        version,
        requestDate,
        adminSignature,
        adminIdentity,
      },
      timeoutMs,
    );
  }

  public async startDatastore(
    id: string,
    dbxPath: string,
    watch = false,
  ): Promise<{ success: boolean }> {
    const { success } = await this.runApi('Datastore.start', {
      id,
      dbxPath,
      watch,
    });
    return { success };
  }

  public async getCreditsBalance(
    id: string,
    version: string,
    creditId: string,
  ): Promise<IDatastoreApiTypes['Datastore.creditsBalance']['result']> {
    return await this.runApi('Datastore.creditsBalance', {
      id,
      version,
      creditId,
    });
  }

  public async createCredits(
    id: string,
    version: string,
    microgons: number,
    adminIdentity: Identity,
  ): Promise<{ id: string; remainingCredits: number; secret: string }> {
    return await this.administer<ReturnType<CreditsTable['create']>>(
      id,
      version,
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
    id: string,
    version: string,
    adminIdentity: Identity,
    adminFunction: {
      ownerType: 'datastore' | 'crawler' | 'extractor' | 'table';
      ownerName: string;
      functionName: string;
    },
    functionArgs: any[],
  ): Promise<T> {
    const message = DatastoreApiClient.createAdminFunctionMessage(
      id,
      adminIdentity.bech32,
      adminFunction.ownerType,
      adminFunction.ownerName,
      adminFunction.functionName,
      functionArgs,
    );
    const adminSignature = adminIdentity.sign(message);

    return await this.runApi('Datastore.admin', {
      id,
      version,
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

  protected onEvent<T extends keyof IDatastoreEvents>(evt: {
    event: ICoreEventPayload<IDatastoreEvents, T>;
  }): void {
    const { event } = evt;
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
    const datastorePathRegex = new RegExp(
      `(?:.+://)?([^/]+)/(?:docs/)?(${datastoreRegex.source})@v(${semverRegex.source})/?`,
    );
    const isFullDomain = domain.match(datastorePathRegex);
    if (isFullDomain) {
      const [, host, datastoreId, datastoreVersion] = isFullDomain;
      return Promise.resolve({ host, datastoreId, datastoreVersion });
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
    datastoreId: string,
    adminIdentity: string,
    ownerType: string,
    ownerName: string,
    functionName: string,
    args: any[],
  ): Buffer {
    return sha256(
      concatAsBuffer(
        'Datastore.admin',
        datastoreId,
        adminIdentity,
        ownerType,
        ownerName,
        functionName,
        TypeSerializer.stringify(args, { sortKeys: true }),
      ),
    );
  }

  public static createUploadSignatureMessage(compressedDbx: Buffer): Buffer {
    return sha256(concatAsBuffer('Datastore.upload', compressedDbx));
  }

  public static createDownloadSignatureMessage(
    id: string,
    version: string,
    requestDate: number,
  ): Buffer {
    return sha256(concatAsBuffer('Datastore.download', id, version, requestDate));
  }
}
