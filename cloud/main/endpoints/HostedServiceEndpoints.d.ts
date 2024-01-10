import IConnectionToClient from '@ulixee/net/interfaces/IConnectionToClient';
import ConnectionToClient from '@ulixee/net/lib/ConnectionToClient';
import { INodeRegistryApis } from '@ulixee/platform-specification/services/NodeRegistryApis';
import { IServicesSetupApis } from '@ulixee/platform-specification/services/SetupApis';
import ICloudApiContext from '../interfaces/ICloudApiContext';
export declare type TServicesApis = IServicesSetupApis<ICloudApiContext> & INodeRegistryApis<ICloudApiContext>;
export declare type TConnectionToServicesClient = IConnectionToClient<TServicesApis, {}>;
export default class HostedServiceEndpoints {
    private readonly handlersByCommand;
    constructor();
    attachToConnection(connection: ConnectionToClient<any, any>, context: ICloudApiContext): TConnectionToServicesClient;
}
