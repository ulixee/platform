/// <reference types="node" />
import Identity from '@ulixee/crypto/lib/Identity';
import { ConnectionToCore } from '@ulixee/net';
import ICoreEventPayload from '@ulixee/net/interfaces/ICoreEventPayload';
import { IPayment } from '@ulixee/platform-specification';
import { IDatastoreApis, IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import IDatastoreEvents from '../interfaces/IDatastoreEvents';
import IItemInputOutput from '../interfaces/IItemInputOutput';
import ITypes from '../types';
import ResultIterable from './ResultIterable';
export declare type IDatastoreExecResult = Omit<IDatastoreApiTypes['Datastore.query']['result'], 'outputs'>;
export declare type IDatastoreExecRelayArgs = Pick<IDatastoreApiTypes['Datastore.query']['args'], 'authentication' | 'payment'>;
export default class DatastoreApiClient {
    connectionToCore: ConnectionToCore<IDatastoreApis, IDatastoreEvents>;
    validateApiParameters: boolean;
    protected activeStreamByQueryId: Map<string, ResultIterable<any, any>>;
    private options;
    private queryLog;
    constructor(host: string, options?: {
        consoleLogErrors?: boolean;
        storeQueryLog?: boolean;
    });
    disconnect(): Promise<void>;
    getMeta(id: string, version: string, includeSchemas?: boolean): Promise<IDatastoreApiTypes['Datastore.meta']['result']>;
    getExtractorPricing<IVersion extends keyof ITypes & string = any, IExtractorName extends keyof ITypes[IVersion]['extractors'] & string = 'default'>(id: string, version: IVersion, extractorName: IExtractorName): Promise<Omit<IDatastoreApiTypes['Datastore.meta']['result']['extractorsByName'][IExtractorName], 'name'> & Pick<IDatastoreApiTypes['Datastore.meta']['result'], 'computePricePerQuery'>>;
    install(id: string, version: string, alias?: string): Promise<IDatastoreApiTypes['Datastore.meta']['result']>;
    /**
     * NOTE: any caller must handle tracking local balances of Credits and removing them if they're depleted!
     */
    stream<IO extends IItemInputOutput, IVersion extends keyof ITypes & string = any, IItemName extends keyof ITypes[IVersion]['extractors'] & string = string, ISchemaDbx extends ITypes[IVersion]['extractors'][IItemName] = IO>(id: string, version: IVersion, name: IItemName, input: ISchemaDbx['input'], options?: {
        queryId?: string;
        payment?: IPayment & {
            onFinalized?(metadata: IDatastoreExecResult['metadata'], error?: Error): void;
        };
        authentication?: IDatastoreExecRelayArgs['authentication'];
        affiliateId?: string;
    }): ResultIterable<ISchemaDbx['output'], IDatastoreApiTypes['Datastore.stream']['result']>;
    /**
     * NOTE: any caller must handle tracking local balances of Credits and removing them if they're depleted!
     */
    query<ISchemaOutput = any, IVersion extends keyof ITypes & string = any>(id: string, version: IVersion, sql: string, options?: {
        boundValues?: any[];
        queryId?: string;
        payment?: IPayment & {
            onFinalized?(metadata: IDatastoreExecResult['metadata'], error?: Error): void;
        };
        authentication?: IDatastoreExecRelayArgs['authentication'];
        affiliateId?: string;
    }): Promise<IDatastoreExecResult & {
        outputs?: ISchemaOutput[];
    }>;
    upload(compressedDbx: Buffer, options?: {
        timeoutMs?: number;
        identity?: Identity;
        forwardedSignature?: {
            adminIdentity: string;
            adminSignature: Buffer;
        };
    }): Promise<{
        success: boolean;
    }>;
    download(id: string, version: string, identity: Identity, options?: {
        timeoutMs?: number;
    }): Promise<IDatastoreApiTypes['Datastore.download']['result']>;
    startDatastore(id: string, dbxPath: string, watch?: boolean): Promise<{
        success: boolean;
    }>;
    getCreditsBalance(id: string, version: string, creditId: string): Promise<IDatastoreApiTypes['Datastore.creditsBalance']['result']>;
    createCredits(id: string, version: string, microgons: number, adminIdentity: Identity): Promise<{
        id: string;
        remainingCredits: number;
        secret: string;
    }>;
    administer<T>(id: string, version: string, adminIdentity: Identity, adminFunction: {
        ownerType: 'datastore' | 'crawler' | 'extractor' | 'table';
        ownerName: string;
        functionName: string;
    }, functionArgs: any[]): Promise<T>;
    request<T extends keyof IDatastoreApiTypes & string>(command: T, args: IDatastoreApiTypes[T]['args'], timeoutMs?: number): Promise<IDatastoreApiTypes[T]['result']>;
    protected onEvent<T extends keyof IDatastoreEvents>(evt: {
        event: ICoreEventPayload<IDatastoreEvents, T>;
    }): void;
    protected runApi<T extends keyof IDatastoreApiTypes & string>(command: T, args: IDatastoreApiTypes[T]['args'], timeoutMs?: number): Promise<IDatastoreApiTypes[T]['result']>;
    static parseDatastoreUrl(url: string): Promise<{
        datastoreId: string;
        host: string;
        datastoreVersion: string;
    }>;
    static createExecSignatureMessage(payment: IPayment, nonce: string): Buffer;
    static createExecAuthentication(payment: IPayment, authenticationIdentity: Identity, nonce?: string): IDatastoreExecRelayArgs['authentication'];
    static createAdminFunctionMessage(datastoreId: string, adminIdentity: string, ownerType: string, ownerName: string, functionName: string, args: any[]): Buffer;
    static createUploadSignatureMessage(compressedDbx: Buffer): Buffer;
    static createDownloadSignatureMessage(id: string, version: string, requestDate: number): Buffer;
}
