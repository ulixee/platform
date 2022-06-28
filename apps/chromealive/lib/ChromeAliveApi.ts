import { Serializable } from 'child_process';
import {
  IChromeAliveApiRequest,
  IChromeAliveApiResponse,
  IChromeAliveApis,
} from '@ulixee/apps-chromealive-interfaces/apis';
import IChromeAliveEvents from '@ulixee/apps-chromealive-interfaces/events';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import IChromeAliveEvent from '@ulixee/apps-chromealive-interfaces/events/IChromeAliveEvent';
import { ConnectionToCore, WsTransportToCore } from '@ulixee/net';
import ITransportToCore from '@ulixee/net/interfaces/ITransportToCore';

type IEvent = keyof IChromeAliveEvents;

export default class ChromeAliveApi extends TypedEventEmitter<{ close: void }> {
  private connection: ConnectionToCore<IChromeAliveApis, IChromeAliveEvents>;
  private readonly transport: ITransportToCore;

  constructor(
    private chromeAliveServerApi: string,
    public onEvent: (event: IEvent, data?: IChromeAliveEvents[IEvent]) => any,
  ) {
    super();
    process.on('disconnect', () => this.onEvent('App.quit'));
    process.on('message', this.onMessage.bind(this));
    this.transport = new WsTransportToCore(chromeAliveServerApi);
    this.connection = new ConnectionToCore(this.transport);
    this.connection.on('event', this.onMessage.bind(this));
    this.connection.on('disconnected', this.onDisconnected.bind(this));
  }

  public async connect(): Promise<void> {
    await this.connection.connect();
  }

  public async disconnect(): Promise<void> {
    await this.connection.disconnect();
  }


  public async send<T extends keyof IChromeAliveApis>(
    command: T,
    ...args: IChromeAliveApiRequest<T>['args']
  ): Promise<IChromeAliveApiResponse<T>['data']> {
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
