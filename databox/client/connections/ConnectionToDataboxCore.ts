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

    // this.hooks.afterConnectFn = this.afterConnect.bind(this);
    // this.hooks.beforeDisconnectFn = this.beforeDisconnect.bind(this);
  }

  // public override sendRequest(
  //   payload: Omit<ICoreCommandRequestPayload, 'messageId' | 'sendTime'>,
  //   timeoutMs?: number,
  // ): Promise<ICoreResponsePayload<any, any>['data']> {
  //   return super.sendRequest(payload, timeoutMs);
  // }

  // protected async afterConnect(): Promise<void> {
  //   const connectOptions = <ICoreConfigureOptions>{
  //     dataDir: this.options.dataDir,
  //     version: this.options.version,
  //   };
  //   const connectResult = await this.sendRequest({
  //     startTime: super.connectStartTime,
  //     command: 'Core.connect',
  //     args: [connectOptions],
  //   });
  // }

  // protected async beforeDisconnect(): Promise<void> {
  //   if (!this.connectPromise) return;

  //   if (!this.connectPromise.isResolved) {
  //     let result;
  //     if (!this.didAutoConnect) {
  //       result = new DisconnectedFromCoreError(this.transport.host);
  //     }
  //     this.connectPromise.resolve(result);
  //   }

  //   if (this.transport.isConnected) {
  //     await this.sendRequest(
  //       {
  //         command: 'Core.disconnect',
  //         startTime: this.disconnectStartTime,
  //         args: [this.disconnectError],
  //       },
  //       2e3,
  //     ).catch(err => err);
  //   }
  // }

  public static remote(host: string): ConnectionToDataboxCore {
    const transport = new WsTransportToCore(`${host}/databox`);
    return new ConnectionToDataboxCore(transport);
  }
}
