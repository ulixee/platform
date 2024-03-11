import SidechainClient from '@ulixee/sidechain';
import IDatastoreCoreConfigureOptions from '../interfaces/IDatastoreCoreConfigureOptions';
export default class SidechainClientManager {
    private readonly options;
    get defaultClient(): SidechainClient;
    private _defaultClient;
    private _approvedSidechainsResolvable;
    private sidechainClientsByIdentity;
    private refreshApprovedSidechainsInterval;
    constructor(options: Partial<Pick<IDatastoreCoreConfigureOptions, 'identityWithSidechain' | 'approvedSidechains' | 'approvedSidechainsRefreshInterval' | 'defaultSidechainHost' | 'defaultSidechainRootIdentity'>>);
    withIdentity(rootIdentity: string): Promise<SidechainClient>;
    getApprovedSidechainRootIdentities(): Promise<Set<string>>;
    getApprovedSidechainsByIdentity(): Promise<IApprovedSidechainByRootIdentity>;
    private createSidechainClient;
    private static parseApprovedSidechains;
}
interface IApprovedSidechainByRootIdentity {
    [rootIdentity: string]: {
        url: string;
    };
}
export {};
