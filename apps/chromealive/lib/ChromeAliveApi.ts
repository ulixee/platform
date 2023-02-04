import { Serializable } from 'child_process';
import {
  IChromeAliveAppApis,
  IChromeAliveSessionApis,
} from '@ulixee/apps-chromealive-interfaces/apis';
import IChromeAliveEvents from '@ulixee/apps-chromealive-interfaces/events';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import IChromeAliveEvent from '@ulixee/apps-chromealive-interfaces/events/IChromeAliveEvent';
import { ConnectionToCore, WsTransportToCore } from '@ulixee/net';
import ITransportToCore from '@ulixee/net/interfaces/ITransportToCore';
import ICoreResponsePayload from '@ulixee/net/interfaces/ICoreResponsePayload';
import ICoreRequestPayload from '@ulixee/net/interfaces/ICoreRequestPayload';

type IEvent = keyof IChromeAliveEvents;

export default class ChromeAliveApi<
  TApis extends IChromeAliveAppApis | IChromeAliveSessionApis,
> extends TypedEventEmitter<{ close: void }> {
  public isConnected = false;
  public address: string;
  public readonly transport: ITransportToCore;
  private connection: ConnectionToCore<TApis, IChromeAliveEvents>;

  constructor(
    address: string,
    public onEvent: (event: IEvent, data?: IChromeAliveEvents[IEvent]) => any,
  ) {
    super();
    try {
      if (!address.includes('://')) address = `ws://${address};`
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
      this.onEvent('App.quit');
      return;
    }
    const apiEvent = message as IChromeAliveEvent<any>;
    this.onEvent(apiEvent.eventType, apiEvent.data);
  }
}
