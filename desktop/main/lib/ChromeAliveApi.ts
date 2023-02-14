import { Serializable } from 'child_process';
import { IChromeAliveSessionApis, IDesktopAppApis } from '@ulixee/desktop-interfaces/apis';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import { ConnectionToCore, WsTransportToCore } from '@ulixee/net';
import ITransportToCore from '@ulixee/net/interfaces/ITransportToCore';
import ICoreResponsePayload from '@ulixee/net/interfaces/ICoreResponsePayload';
import ICoreRequestPayload from '@ulixee/net/interfaces/ICoreRequestPayload';
import IChromeAliveSessionEvents from '@ulixee/desktop-interfaces/events/IChromeAliveSessionEvents';
import IDesktopAppEvents from '@ulixee/desktop-interfaces/events/IDesktopAppEvents';

export default class ChromeAliveApi<
  TApis extends IDesktopAppApis | IChromeAliveSessionApis,
  TEvents extends IChromeAliveSessionEvents | IDesktopAppEvents,
  TEventNames extends keyof TEvents = keyof TEvents,
> extends TypedEventEmitter<{ close: void }> {
  public isConnected = false;
  public address: string;
  public readonly transport: ITransportToCore;
  private connection: ConnectionToCore<TApis, TEvents>;

  constructor(
    address: string,
    public onEvent: (event: TEventNames, data?: TEvents[TEventNames]) => any,
  ) {
    super();
    try {
      if (!address.includes('://')) address = `ws://${address};`;
      const url = new URL(address);
      url.hostname.replace('localhost', '127.0.0.1');
      this.address = url.href;
    } catch (error) {
      console.error('Invalid ChromeAliveApi URL', error, { address });
      throw error;
    }
    this.transport = new WsTransportToCore(this.address);
    this.connection = new ConnectionToCore(this.transport);
    this.connection.on('event', this.onMessage.bind(this));
    this.connection.on('disconnected', this.onDisconnected.bind(this));
  }

  public async connect(): Promise<void> {
    await this.connection.connect();
    this.isConnected = true;
  }

  public async disconnect(): Promise<void> {
    this.isConnected = false;
    await this.connection.disconnect();
  }

  public async send<T extends keyof TApis & string>(
    command: T,
    ...args: ICoreRequestPayload<TApis, T>['args']
  ): Promise<ICoreResponsePayload<TApis, T>['data']> {
    return await this.connection.sendRequest({ command, args });
  }

  private onDisconnected(): void {
    this.emit('close');
  }

  private onMessage(message: Serializable): void {
    if (message === 'exit') {
      this.onEvent('App.quit' as any);
      return;
    }
    const apiEvent = message as any;
    this.onEvent(apiEvent.eventType, apiEvent.data);
  }
}
