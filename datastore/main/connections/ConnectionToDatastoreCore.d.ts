import { IDatastoreApis, IEscrowApis, IEscrowEvents } from '@ulixee/platform-specification/datastore';
import { ConnectionToCore } from '@ulixee/net';
import ITransport from '@ulixee/net/interfaces/ITransport';
import IDatastoreEvents from '../interfaces/IDatastoreEvents';
interface IConnectionToCoreOptions {
    version?: string;
}
export default class ConnectionToDatastoreCore extends ConnectionToCore<IDatastoreApis & IEscrowApis, IDatastoreEvents & IEscrowEvents> {
    options: IConnectionToCoreOptions;
    constructor(transport: ITransport, options?: IConnectionToCoreOptions);
    static remote(host: string): ConnectionToDatastoreCore;
}
export {};
