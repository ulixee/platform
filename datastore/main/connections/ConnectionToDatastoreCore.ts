import { IDatastoreApis } from '@ulixee/platform-specification/datastore';
import { ConnectionToCore, WsTransportToCore } from '@ulixee/net';
import ITransportToCore from '@ulixee/net/interfaces/ITransportToCore';
import addGlobalInstance from '@ulixee/commons/lib/addGlobalInstance';

interface IConnectionToCoreOptions {
  version?: string;
}

export default class ConnectionToDatastoreCore extends ConnectionToCore<IDatastoreApis, {}> {
  public options: IConnectionToCoreOptions;

  constructor(transport: ITransportToCore<any, any>, options?: IConnectionToCoreOptions) {
    super(transport);
    this.options = options ?? {};
  }

  public static remote(host: string): ConnectionToDatastoreCore {
    const transport = new WsTransportToCore(`${host}/datastore`);
    return new ConnectionToDatastoreCore(transport);
  }
}

addGlobalInstance(ConnectionToDatastoreCore);
