import { IDataboxApis } from '@ulixee/specification/databox';
import { ConnectionToCore, WsTransportToCore } from '@ulixee/net';

export default class ConnectionToDataboxCore extends ConnectionToCore<IDataboxApis, {}> {
  public static remote(host: string): ConnectionToDataboxCore {
    const transport = new WsTransportToCore(`${host}/databox`);
    return new ConnectionToDataboxCore(transport);
  }
}
