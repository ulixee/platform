import Datastore, { IExtractorRunOptions } from '@ulixee/datastore';
import IQueryOptions from '@ulixee/datastore/interfaces/IQueryOptions';
import IStorageEngine from '@ulixee/datastore/interfaces/IStorageEngine';
import PricingManager from '@ulixee/datastore/lib/PricingManager';
import {
  IDatastoreMetadataResult,
  IDatastoreQueryMetadata,
  IDatastoreQueryResult,
} from '@ulixee/platform-specification/datastore/DatastoreApis';
import IDatastorePricing from '@ulixee/platform-specification/types/IDatastorePricing';
import IDatastoreApiContext from '../interfaces/IDatastoreApiContext';
import { IDatastoreManifestWithRuntime } from './DatastoreRegistry';
import { validateAuthentication, validateFunctionCoreVersions } from './datastoreUtils';
import PaymentsProcessor from './PaymentsProcessor';
import { ICacheUpdates } from '@ulixee/datastore/interfaces/IExtractorPluginCore';
import Logger from '@ulixee/commons/lib/Logger';

const { log } = Logger(module);

export default class QueryRunner {
  public startTime = Date.now();
  public heroSessionIds = new Set<string>();
  public datastoreManifest: IDatastoreManifestWithRuntime;
  public microgons = 0;

  public get milliseconds(): number {
    return Date.now() - this.startTime;
  }

  public get cloudNodeHost(): string {
    return this.context.cloudNodeAddress.host;
  }

  public get cloudNodeIdentity(): string {
    return this.context.cloudNodeIdentity?.bech32;
  }

  public paymentsProcessor?: PaymentsProcessor;

  public storageEngineMetadata: IDatastoreMetadataResult;
  public storageEngine: IStorageEngine;

  private remoteQueryCounter = 0;
  private localMachineTableCalls: string[] = [];

  constructor(
    readonly context: IDatastoreApiContext,
    readonly queryDetails: IDatastoreQueryMetadata,
  ) {}

  public async openDatastore(): Promise<Datastore> {
    const { id, version, authentication, payment } = this.queryDetails;
    const manifestWithRuntime = await this.context.datastoreRegistry.get(id, version);
    this.datastoreManifest = manifestWithRuntime;

    const storage = this.context.storageEngineRegistry.get(manifestWithRuntime, this.queryDetails);
    this.storageEngine = storage;

    const datastore = await this.context.vm.open(
      manifestWithRuntime.runtimePath,
      storage,
      manifestWithRuntime,
    );

    this.paymentsProcessor = new PaymentsProcessor(payment, id, datastore, this.context);
    await validateAuthentication(datastore, payment, authentication);
    return datastore;
  }

  public async beforeAll(
    query: string,
    input: any[],
    entityCalls: string[],
  ): Promise<IDatastoreQueryResult | undefined> {
    try {
      await this.paymentsProcessor.debit(
        this.queryDetails.queryId,
        this.datastoreManifest,
        entityCalls,
      );

      this.localMachineTableCalls = this.storageEngine.filterLocalTableCalls(entityCalls);
    } catch (error) {
      return this.finalize(query, input, error);
    }
  }

  public beforeStorageEngine(options: IQueryOptions): IQueryOptions {
    options = { ...options };
    options.onQueryResult = result => {
      this.storageEngineMetadata = result.metadata;
    };
    if (options.queryId) options.queryId += '.Q';
    return options;
  }

  public async onPassthroughTable<TOutput>(
    name: string,
    options: IQueryOptions,
    run: (options: IQueryOptions) => Promise<TOutput>,
  ): Promise<TOutput> {
    this.remoteQueryCounter += 1;
    options = { ...options };
    options.queryId += `.${this.remoteQueryCounter}`;
    let upstreamMeta: IDatastoreMetadataResult;
    options.onQueryResult = result => {
      upstreamMeta = result?.metadata;
    };
    const pricing = this.getCallPricing(name);
    const result = await this.context.workTracker.trackRun(run(options));
    this.paymentsProcessor.trackCallResult(name, BigInt(pricing[0]?.basePrice ?? 0), upstreamMeta);
    return result;
  }

  public async runFunction<TSchema, TOutput>(
    name: string,
    options: IExtractorRunOptions<TSchema>,
    run: (options: IExtractorRunOptions<TSchema>) => Promise<TOutput>,
  ): Promise<TOutput> {
    const { pluginCoresByName } = this.context;
    const runStart = Date.now();
    validateFunctionCoreVersions(this.datastoreManifest, name, this.context);

    options = { ...options, ...this.queryDetails };

    options.trackMetadata = (metaName, metaValue) => {
      if (metaName === 'heroSessionId') {
        this.heroSessionIds.add(metaValue);
      }
    };
    for (const plugin of Object.values(pluginCoresByName)) {
      if (plugin.beforeRunExtractor)
        await plugin.beforeRunExtractor(options, {
          scriptEntrypoint: this.datastoreManifest.runtimePath,
          functionName: name,
        });
    }

    let runError: Error;
    let outputs: TOutput;
    let bytes = 0;
    let microgons = 0n;

    const pricing = this.getCallPricing(name);

    let upstreamMeta: IDatastoreMetadataResult;
    if (pricing[1]?.remoteMeta) {
      options.onQueryResult = result => {
        upstreamMeta = result?.metadata;
      };
      if (options.queryId) {
        this.remoteQueryCounter += 1;
        options.queryId += `.${this.remoteQueryCounter}`;
      }
    }

    const cacheOutputs: ICacheUpdates = {};
    options.onCacheUpdated = (sessionId, crawler, action) => {
      cacheOutputs[sessionId] = { crawler, action };
    };

    try {
      outputs = await this.context.workTracker.trackRun(run(options));
      // release the hold
      bytes = PricingManager.getOfficialBytes(outputs);
      microgons = this.paymentsProcessor.trackCallResult(
        name,
        BigInt(pricing[0]?.basePrice) ?? 0n,
        upstreamMeta,
      );
    } catch (error) {
      runError = error;
    }

    for (const plugin of Object.values(pluginCoresByName)) {
      if (plugin.afterRunExtractor)
        await plugin.afterRunExtractor(options, outputs, cacheOutputs, {
          scriptEntrypoint: this.datastoreManifest.runtimePath,
          functionName: name,
        });
    }

    await this.context.statsTracker.recordEntityStats({
      version: options.version,
      datastoreId: options.id,
      entityName: name,
      bytes,
      microgons,
      milliseconds: Date.now() - runStart,
      didUseCredits: !!this.queryDetails.payment?.credits,
      cloudNodeHost: this.cloudNodeHost,
      cloudNodeIdentity: this.cloudNodeIdentity,
      error: runError,
    });
    // Do we need to rollback the stats? We won't finalize payment in this scenario.
    if (runError) throw runError;
    return outputs;
  }

  public async finalize(
    query: string,
    input: any[],
    finalResult: Error | any[],
  ): Promise<IDatastoreQueryResult> {
    let outputs: any[];
    let runError: Error;
    let bytes = 0;
    if (finalResult instanceof Error) {
      runError = finalResult;
    } else {
      outputs = finalResult;
      bytes = PricingManager.getOfficialBytes(outputs);
    }
    if (this.storageEngineMetadata)
      this.paymentsProcessor.storageEngineResult(this.storageEngineMetadata);

    for (const tableCall of this.localMachineTableCalls) {
      const pricing = this.getCallPricing(tableCall) ?? [];
      const price = BigInt(pricing[0]?.basePrice ?? 0);
      this.paymentsProcessor.trackCallResult(tableCall, price);
    }
    let microgons = 0n;
    try {
      microgons = await this.paymentsProcessor.finalize(bytes);
    } catch (error) {
      if (!runError) runError = error;
      else {
        log.error('Error finalizing payment', { error, sessionId: this.queryDetails.queryId });
      }
    }

    const metadata = {
      bytes,
      microgons,
      milliseconds: Date.now() - this.startTime,
    };

    await this.recordQueryResult(query, input, outputs, metadata, runError);

    return {
      outputs,
      runError,
      latestVersion: this.datastoreManifest.latestVersion,
      metadata,
    };
  }

  private recordQueryResult(
    query: string,
    input: any[],
    outputs: any[],
    metadata: IDatastoreMetadataResult,
    runError?: Error,
  ): Promise<void> {
    const { id, version, queryId, payment, affiliateId } = this.queryDetails;
    return this.context.statsTracker.recordQuery({
      queryId,
      query,
      startTime: this.startTime,
      input,
      outputs,
      version,
      datastoreId: id,
      ...metadata,
      channelHoldId: payment?.channelHold?.id,
      creditId: payment?.credits?.id,
      affiliateId,
      error: runError,
      heroSessionIds: [...this.heroSessionIds],
      cloudNodeHost: this.cloudNodeHost,
      cloudNodeIdentity: this.cloudNodeIdentity,
    });
  }

  private getCallPricing(name: string): IDatastorePricing[] {
    return (
      this.datastoreManifest.extractorsByName[name] ??
      this.datastoreManifest.crawlersByName[name] ??
      this.datastoreManifest.tablesByName[name]
    ).prices;
  }
}

export interface IRequestDetails {
  id: string;
  version: string;
}
