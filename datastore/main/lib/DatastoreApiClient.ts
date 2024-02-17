import { concatAsBuffer } from '@ulixee/commons/lib/bufferUtils';
import { sha256 } from '@ulixee/commons/lib/hashUtils';
import TimedCache from '@ulixee/commons/lib/TimedCache';
import TypeSerializer from '@ulixee/commons/lib/TypeSerializer';
import { toUrl } from '@ulixee/commons/lib/utils';
import { MainchainClient } from '@ulixee/localchain';
import { ConnectionToCore, WsTransportToCore } from '@ulixee/net';
import ICoreEventPayload from '@ulixee/net/interfaces/ICoreEventPayload';
import { IPayment } from '@ulixee/platform-specification';
import DatastoreApiSchemas, {
  IDatastoreApis,
  IDatastoreApiTypes,
  IEscrowApis,
  IEscrowEvents,
} from '@ulixee/platform-specification/datastore';
import { IDatastoreQueryResult } from '@ulixee/platform-specification/datastore/DatastoreApis';
import IEscrowApiTypes, {
  EscrowApisSchema,
} from '@ulixee/platform-specification/datastore/EscrowApis';
import IBalanceChange from '@ulixee/platform-specification/types/IBalanceChange';
import ValidationError from '@ulixee/platform-specification/utils/ValidationError';
import Identity from '@ulixee/platform-utils/lib/Identity';
import { nanoid } from 'nanoid';
import IDatastoreEvents from '../interfaces/IDatastoreEvents';
import { IDatastoreHost } from '../interfaces/IDatastoreHostLookup';
import IItemInputOutput from '../interfaces/IItemInputOutput';
import IPaymentService from '../interfaces/IPaymentService';
import { IQueryOptionsWithoutId } from '../interfaces/IQueryOptions';
import ITypes from '../types';
import installDatastoreSchema, { addDatastoreAlias } from '../types/installDatastoreSchema';
import CreditsTable from './CreditsTable';
import DatastoreLookup from './DatastoreLookup';
import DatastorePricing from './PricingManager';
import QueryLog from './QueryLog';
import ResultIterable from './ResultIterable';

export type IDatastoreExecRelayArgs = Pick<
  IDatastoreApiTypes['Datastore.query']['args'],
  'authentication' | 'payment'
>;
export type IDatastoreMeta = IDatastoreApiTypes['Datastore.meta']['result'];

export default class DatastoreApiClient {
  public connectionToCore: ConnectionToCore<
    IDatastoreApis & IEscrowApis,
    IDatastoreEvents & IEscrowEvents
  >;

  public host: string;
  public validateApiParameters = true;
  public pricing: DatastorePricing;
  protected activeStreamByQueryId = new Map<string, ResultIterable<any, any>>();
  private manifestByDatastoreUrl = new Map<string, TimedCache<IDatastoreMeta>>();
  private options: { consoleLogErrors: boolean; storeQueryLog: boolean };
  private queryLog: QueryLog;

  constructor(host: string, options?: { consoleLogErrors?: boolean; storeQueryLog?: boolean }) {
    this.options = options ?? ({} as any);
    this.options.consoleLogErrors ??= process.env.NODE_ENV === 'test';
    this.options.storeQueryLog ??= process.env.NODE_ENV !== 'test';
    const url = toUrl(host);
    this.host = url.host;
    const transport = new WsTransportToCore(`ws://${url.host}/datastore`);
    this.connectionToCore = new ConnectionToCore(transport);
    this.connectionToCore.on('event', this.onEvent.bind(this));
    if (this.options.storeQueryLog) {
      this.queryLog = new QueryLog();
    }
    this.pricing = new DatastorePricing(this);
  }

  public async disconnect(): Promise<void> {
    await Promise.all([this.queryLog?.close(), this.connectionToCore.disconnect()]);
  }

  public async getMetaAndSchema(id: string, version: string): Promise<IDatastoreMeta> {
    return await this.runApi('Datastore.meta', {
      id,
      version,
      includeSchemasAsJson: true,
    });
  }

  public async registerEscrow(
    datastoreId: string,
    balanceChange: IBalanceChange,
  ): Promise<{ accepted: boolean }> {
    return await this.runApi('Escrow.register', {
      escrow: balanceChange as any,
      datastoreId,
    });
  }

  public async getMeta(id: string, version: string): Promise<IDatastoreMeta> {
    const key = `${this.host}/${id}@${version}`;
    let cache = this.manifestByDatastoreUrl.get(key);
    if (!cache) {
      // cache for 24 hours
      cache = new TimedCache<IDatastoreMeta>(24 * 60 * 60e3);
      this.manifestByDatastoreUrl.set(key, cache);
    }
    cache.value ??= await this.runApi('Datastore.meta', {
      id,
      version,
      includeSchemasAsJson: false,
    });
    return cache.value;
  }

  public async install(id: string, version: string, alias?: string): Promise<IDatastoreMeta> {
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
    options?: IQueryOptionsWithoutId & { paymentService?: IPaymentService },
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
    options?: IQueryOptionsWithoutId & { paymentService?: IPaymentService },
  ): ResultIterable<
    ISchemaDbx['output'],
    IDatastoreApiTypes['Datastore.stream']['result'] & { queryId: string }
  > {
    options ??= {} as any;
    const queryId = options?.queryId ?? nanoid(12);
    const startDate = new Date();
    const results = new ResultIterable<
      ISchemaDbx['output'],
      IDatastoreApiTypes['Datastore.stream']['result'] & { queryId: string }
    >();
    this.activeStreamByQueryId.set(id, results);
    const host = this.connectionToCore.transport.host;
    const hostIdentity = null; // TODO: exchange identity
    const query: IDatastoreApiTypes['Datastore.stream']['args'] = {
      id,
      version,
      queryId,
      name,
      input,
      authentication: options.authentication,
      affiliateId: options.affiliateId,
    };

    let paymentService = options.paymentService;

    (async () => {
      const price = await this.pricing.getEntityPrice(id, version, name);
      try {
        const paymentInfo = (await this.getMeta(id, version)).payment;
        if (!paymentInfo || price <= 0) paymentService = null;
        const payment = await paymentService?.reserve({
          host,
          id,
          version,
          microgons: price,
          recipient: paymentInfo,
          domain: options.domain,
        });
        if (payment) {
          query.payment = payment;
        }

        const result = await this.runApi('Datastore.stream', query).catch(async err => {
          await paymentService?.finalize({ ...payment, finalMicrogons: 0 });
          throw err;
        });
        await paymentService?.finalize({
          ...payment,
          finalMicrogons: result.metadata.microgons,
        });
        if (options.onQueryResult) await options.onQueryResult(result);

        (result as any).queryId = queryId;
        if (result.runError) results.reject(result.runError, result as any);
        else results.done(result as any);

        this.queryLog?.log(query, startDate, results.results, result.metadata, host, hostIdentity);
      } catch (error) {
        results.reject(error);
        this.queryLog?.log(query, startDate, null, null, host, hostIdentity, error);
      } finally {
        this.activeStreamByQueryId.delete(id);
      }
    })().catch(results.reject);

    return results;
  }

  /**
   * NOTE: any caller must handle tracking local balances of Credits and removing them if they're depleted!
   */
  public async query<ISchemaOutput = any, IVersion extends keyof ITypes & string = any>(
    id: string,
    version: IVersion,
    sql: string,
    options?: IQueryOptionsWithoutId & {
      paymentService?: IPaymentService;
      boundValues?: any[];
    },
  ): Promise<IDatastoreQueryResult & { outputs?: ISchemaOutput[]; queryId: string }> {
    const startDate = new Date();
    options ??= {} as any;
    const queryId = options?.queryId ?? nanoid(12);

    const price = await this.pricing.getQueryPrice(id, version, sql);
    const host = this.connectionToCore.transport.host;
    const paymentInfo = (await this.getMeta(id, version)).payment;
    let paymentService = options.paymentService;
    if (!paymentInfo || price <= 0) paymentService = null;

    const payment = await paymentService?.reserve({
      id,
      version,
      host,
      microgons: price,
      recipient: paymentInfo,
      domain: options.domain,
    });
    const query = {
      id,
      queryId,
      version,
      sql,
      boundValues: options.boundValues ?? [],
      payment,
      authentication: options.authentication,
      affiliateId: options.affiliateId,
    };

    const hostIdentity = null; // TODO: exchange identity
    let result: IDatastoreQueryResult;
    try {
      result = await this.runApi('Datastore.query', query);
    } catch (error) {
      // this will only happen if the query is rejected by the server or before getting there. We need to rollback payment
      if (payment) await paymentService?.finalize({ ...payment, finalMicrogons: 0 });
      this.queryLog?.log(query, startDate, null, null, host, hostIdentity, error);
      throw error;
    }
    if (options.onQueryResult) await options.onQueryResult(result);
    if (payment)
      await paymentService?.finalize({
        ...payment,
        finalMicrogons: result.metadata.microgons,
      });

    this.queryLog?.log(query, startDate, result.outputs, result.metadata, host, hostIdentity);
    if (result.runError) {
      throw result.runError;
    }
    (result as any).queryId = queryId;
    return result as any;
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

  protected async runApi<T extends keyof IEscrowApiTypes & string>(
    command: T,
    args: IEscrowApiTypes[T]['args'],
    timeoutMs?: number,
  ): Promise<IEscrowApiTypes[T]['result']>;
  protected async runApi<T extends keyof IDatastoreApiTypes & string>(
    command: T,
    args: IDatastoreApiTypes[T]['args'],
    timeoutMs?: number,
  ): Promise<IDatastoreApiTypes[T]['result']>;
  protected async runApi(command: any, args: any, timeoutMs?: number): Promise<any> {
    try {
      if (this.validateApiParameters) {
        const schema = DatastoreApiSchemas[command] ?? EscrowApisSchema[command];
        args = await schema.args.parseAsync(args);
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

  public static async lookupDatastoreHost(
    datastoreUrl: string,
    mainchainUrl: string,
  ): Promise<IDatastoreHost> {
    const mainchainClient = mainchainUrl ? await MainchainClient.connect(mainchainUrl, 10e3) : null;
    const lookup = await new DatastoreLookup(mainchainClient).getHostInfo(datastoreUrl);

    await mainchainClient?.close();
    return lookup;
  }

  public static createExecSignatureMessage(payment: IPayment, nonce: string): Buffer {
    return sha256(
      concatAsBuffer('Datastore.exec', payment?.credits?.id, payment?.escrow?.id, nonce),
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
