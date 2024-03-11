import { IDatastoreApis } from '@ulixee/platform-specification/datastore';
import { ConnectionToCore } from '@ulixee/net';
import ITransport from '@ulixee/net/interfaces/ITransport';
interface IConnectionToCoreOptions {
    version?: string;
}
export default class ConnectionToDatastoreCore extends ConnectionToCore<IDatastoreApis, {}> {
    options: IConnectionToCoreOptions;
    constructor(transport: ITransport, options?: IConnectionToCoreOptions);
    static remote(host: string): ConnectionToDatastoreCore;
}
export {};
