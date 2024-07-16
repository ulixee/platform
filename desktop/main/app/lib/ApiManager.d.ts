import { CloudNode } from '@ulixee/cloud';
import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import Resolvable from '@ulixee/commons/lib/Resolvable';
import IDatastoreDeployLogEntry from '@ulixee/datastore-core/interfaces/IDatastoreDeployLogEntry';
import { IWallet } from '@ulixee/datastore/interfaces/IPaymentService';
import IQueryLogEntry from '@ulixee/datastore/interfaces/IQueryLogEntry';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import DatastoreApiClients from '@ulixee/datastore/lib/DatastoreApiClients';
import LocalUserProfile from '@ulixee/datastore/lib/LocalUserProfile';
import QueryLog from '@ulixee/datastore/lib/QueryLog';
import DefaultPaymentService from '@ulixee/datastore/payments/DefaultPaymentService';
import { IDesktopAppApis } from '@ulixee/desktop-interfaces/apis';
import { ICloudConnected } from '@ulixee/desktop-interfaces/apis/IDesktopApis';
import IDesktopAppEvents from '@ulixee/desktop-interfaces/events/IDesktopAppEvents';
import WebSocket = require('ws');
import AccountManager from './AccountManager';
import ApiClient from './ApiClient';
import { IArgonFile } from './ArgonFile';
import DeploymentWatcher from './DeploymentWatcher';
import PrivateDesktopApiHandler from './PrivateDesktopApiHandler';
export default class ApiManager<TEventType extends keyof IDesktopAppEvents & string = keyof IDesktopAppEvents> extends TypedEventEmitter<{
    'api-event': {
        cloudAddress: string;
        eventType: TEventType;
        data: IDesktopAppEvents[TEventType];
    };
    'new-cloud-address': ICloudConnected;
    'argon-file-opened': IArgonFile;
    deployment: IDatastoreDeployLogEntry;
    'wallet-updated': {
        wallet: IWallet;
    };
    query: IQueryLogEntry;
}> {
    apiByCloudAddress: Map<string, {
        name: string;
        adminIdentity?: string;
        cloudNodes: number;
        type: 'local' | 'public' | 'private';
        resolvable: Resolvable<IApiGroup>;
    }>;
    localCloud: CloudNode;
    exited: boolean;
    events: EventSubscriber;
    localCloudAddress: string;
    debuggerUrl: string;
    localUserProfile: LocalUserProfile;
    deploymentWatcher: DeploymentWatcher;
    paymentService: DefaultPaymentService;
    accountManager: AccountManager;
    queryLogWatcher: QueryLog;
    privateDesktopApiHandler: PrivateDesktopApiHandler;
    privateDesktopWsServer: WebSocket.Server;
    privateDesktopWsServerAddress: string;
    datastoreApiClients: DatastoreApiClients;
    private reconnectsByAddress;
    constructor();
    start(): Promise<void>;
    getWallet(): Promise<IWallet>;
    close(): Promise<void>;
    stopLocalCloud(): Promise<void>;
    startLocalCloud(): Promise<void>;
    getDatastoreClient(cloudHost: string): DatastoreApiClient;
    getCloudAddressByName(name: string): string;
    connectToCloud(cloud: ICloudSetup): Promise<void>;
    onArgonFileOpened(file: string): Promise<void>;
    private onDesktopEvent;
    private onDevtoolsError;
    private onNewLocalCloudAddress;
    private onApiClosed;
    private reconnect;
    private closeApiGroup;
    private connectToWebSocket;
    private handlePrivateApiWsConnection;
    private getDebuggerUrl;
    private formatCloudAddress;
}
interface IApiGroup {
    api: ApiClient<IDesktopAppApis, IDesktopAppEvents>;
    id: string;
    wsToCore: WebSocket;
    wsToDevtoolsProtocol: WebSocket;
}
interface ICloudSetup {
    address: string;
    adminIdentity?: string;
    type: 'public' | 'private' | 'local';
    name?: string;
    oldAddress?: string;
}
export {};
