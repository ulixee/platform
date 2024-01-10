import { IAsyncFunc } from '@ulixee/net/interfaces/IApiHandlers';
import ITransport from '@ulixee/net/interfaces/ITransport';
import ConnectionToClient from '@ulixee/net/lib/ConnectionToClient';
import { IDatastoreRegistryApis } from '@ulixee/platform-specification/services/DatastoreRegistryApis';
import { IStatsTrackerApis } from '@ulixee/platform-specification/services/StatsTrackerApis';
import { IZodApiTypes } from '@ulixee/specification/utils/IZodApi';
import IDatastoreApiContext from '../interfaces/IDatastoreApiContext';
export declare type TServicesApis = IDatastoreRegistryApis<IDatastoreApiContext> & IStatsTrackerApis<IDatastoreApiContext>;
export declare type TConnectionToServicesClient = ConnectionToClient<TServicesApis, {}>;
export default class HostedServicesEndpoints {
    connections: Set<TConnectionToServicesClient>;
    private readonly handlersByCommand;
    constructor();
    addConnection(transport: ITransport, context: IDatastoreApiContext): TConnectionToServicesClient;
}
export declare function validateThenRun(api: string, handler: IAsyncFunc, validationSchema: IZodApiTypes | undefined, args: any, context: IDatastoreApiContext): Promise<any>;
