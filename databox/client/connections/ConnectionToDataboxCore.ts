import { IDataboxApis } from '@ulixee/specification/databox';
import { ConnectionToCore, WsTransportToCore } from '@ulixee/net';
import ITransportToCore from '@ulixee/net/interfaces/ITransportToCore';

interface IConnectionToCoreOptions {
  version?: string;
}

export default class ConnectionToDataboxCore extends ConnectionToCore<IDataboxApis, {}> {
  public options: IConnectionToCoreOptions;

  constructor(
    transport: ITransportToCore<any, any>,
    options?: IConnectionToCoreOptions,
  ) {
    super(transport);
    this.options = options ?? {};
  }

  public static remote(host: string): ConnectionToDataboxCore {
    const transport = new WsTransportToCore(`${host}/databox`);
    return new ConnectionToDataboxCore(transport);
  }
}
