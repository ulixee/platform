import {
  IDatastoreApis,
  IEscrowApis,
  IEscrowEvents,
} from '@ulixee/platform-specification/datastore';
import { ConnectionToCore, WsTransportToCore } from '@ulixee/net';
import ITransport from '@ulixee/net/interfaces/ITransport';
import addGlobalInstance from '@ulixee/commons/lib/addGlobalInstance';
import IDatastoreEvents from '../interfaces/IDatastoreEvents';

interface IConnectionToCoreOptions {
  version?: string;
}

export default class ConnectionToDatastoreCore extends ConnectionToCore<
  IDatastoreApis & IEscrowApis,
  IDatastoreEvents & IEscrowEvents
> {
  public options: IConnectionToCoreOptions;

  constructor(transport: ITransport, options?: IConnectionToCoreOptions) {
    super(transport);
    this.options = options ?? {};
  }

  public static remote(host: string): ConnectionToDatastoreCore {
    const transport = new WsTransportToCore(`${host}/datastore`);
    return new ConnectionToDatastoreCore(transport);
  }
}

addGlobalInstance(ConnectionToDatastoreCore);
