import { IDataboxApis } from '@ulixee/databox-interfaces/IDataboxApis';
import { ConnectionToCore, WsTransportToCore } from '@ulixee/net';

export default class ConnectionToDataboxCore extends ConnectionToCore<IDataboxApis, {}> {
  public static remote(serverHost: string): ConnectionToDataboxCore {
    const transport = new WsTransportToCore(`${serverHost}/databox`);
    return new ConnectionToDataboxCore(transport);
  }
}
