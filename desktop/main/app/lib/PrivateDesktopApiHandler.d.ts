/// <reference types="node" />
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import IDatastoreDeployLogEntry from '@ulixee/datastore-core/interfaces/IDatastoreDeployLogEntry';
import type ILocalUserProfile from '@ulixee/datastore/interfaces/ILocalUserProfile';
import { IDatabrokerAccount, IWallet } from '@ulixee/datastore/interfaces/IPaymentService';
import IQueryLogEntry from '@ulixee/datastore/interfaces/IQueryLogEntry';
import { IArgonFileMeta, IDatastoreResultItem, IDesktopAppPrivateApis, TCredit } from '@ulixee/desktop-interfaces/apis';
import { ICloudConnected } from '@ulixee/desktop-interfaces/apis/IDesktopApis';
import IDesktopAppPrivateEvents from '@ulixee/desktop-interfaces/events/IDesktopAppPrivateEvents';
import { LocalchainOverview } from '@ulixee/localchain';
import IArgonFile from '@ulixee/platform-specification/types/IArgonFile';
import { WebContents } from 'electron';
import { IncomingMessage } from 'http';
import WebSocket = require('ws');
import ApiManager from './ApiManager';
export interface IOpenReplay {
    cloudAddress: string;
    heroSessionId: string;
    dbPath: string;
}
export default class PrivateDesktopApiHandler extends TypedEventEmitter<{
    'open-replay': IOpenReplay;
}> {
    private readonly apiManager;
    Apis: IDesktopAppPrivateApis;
    Events: IDesktopAppPrivateEvents;
    private connectionToClient;
    private waitForConnection;
    private events;
    constructor(apiManager: ApiManager);
    onConnection(ws: WebSocket, req: IncomingMessage): void;
    close(): Promise<void>;
    getWallet(): Promise<IWallet>;
    completeGettingStartedStep(step: string): Promise<void>;
    gettingStartedProgress(): string[];
    onArgonFileDrop(path: string): Promise<void>;
    addBrokerAccount(request: Omit<IDatabrokerAccount, 'balance'>): Promise<IDatabrokerAccount>;
    createAccount(request: {
        name: string;
        suri?: string;
        password?: string;
    }): Promise<LocalchainOverview>;
    createArgonsToSendFile(request: {
        milligons: bigint;
        fromAddress?: string;
        toAddress?: string;
    }): Promise<IArgonFileMeta>;
    transferArgonsFromMainchain(request: {
        milligons: bigint;
        address?: string;
    }): Promise<void>;
    transferArgonsToMainchain(request: {
        milligons: bigint;
        address?: string;
    }): Promise<void>;
    createArgonsToRequestFile(request: {
        milligons: bigint;
        sendToMyAddress?: string;
    }): Promise<IArgonFileMeta>;
    acceptArgonRequest(request: {
        argonFile: IArgonFile;
        fundWithAddress?: string;
    }): Promise<void>;
    importArgons(claim: {
        argonFile: IArgonFile;
    }): Promise<void>;
    getInstalledDatastores(): ILocalUserProfile['installedDatastores'];
    getQueries(): IQueryLogEntry[];
    queryDatastore(args: {
        id: string;
        version: string;
        cloudHost: string;
        query: string;
    }): Promise<IQueryLogEntry>;
    deployDatastore(args: {
        id: string;
        version: string;
        cloudHost: string;
        cloudName: string;
    }): Promise<void>;
    installDatastore(arg: {
        cloudHost: string;
        id: string;
        version: string;
    }): Promise<void>;
    uninstallDatastore(arg: {
        cloudHost: string;
        id: string;
        version: string;
    }): Promise<void>;
    setDatastoreAdminIdentity(datastoreId: string, adminIdentityPath: string): Promise<string>;
    saveCredit(arg: {
        credit: TCredit;
    }): Promise<void>;
    createCredit(args: {
        datastore: Pick<IDatastoreResultItem, 'id' | 'version' | 'name' | 'scriptEntrypoint'>;
        cloud: string;
        argons: number;
    }): Promise<IArgonFileMeta>;
    dragArgonsAsFile(args: IArgonFileMeta, context: WebContents): Promise<void>;
    showContextMenu(args: IArgonFileMeta & {
        position: {
            x: number;
            y: number;
        };
    }): Promise<void>;
    onArgonFileOpened(file: IArgonFile): Promise<void>;
    findAdminIdentity(datastoreId: string): Promise<string>;
    findCloudAdminIdentity(cloudName: string): Promise<string>;
    getAdminIdentities(): {
        datastoresById: {
            [id: string]: string;
        };
        cloudsByName: {
            [name: string]: string;
        };
    };
    onDeployment(event: IDatastoreDeployLogEntry): Promise<void>;
    onQuery(event: IQueryLogEntry): Promise<void>;
    onNewCloudAddress(event: ICloudConnected): Promise<void>;
    onWalletUpdated(event: {
        wallet: IWallet;
    }): Promise<void>;
    openReplay(arg: IOpenReplay): void;
    getCloudConnections(): ICloudConnected[];
    connectToPrivateCloud(arg: {
        address: string;
        name: string;
        adminIdentityPath?: string;
    }): Promise<void>;
}
