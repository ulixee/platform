import { Serializable } from 'child_process';
import {
  IChromeAliveApis,
  IChromeAliveApiResponse,
} from '@ulixee/apps-chromealive-interfaces/apis';
import IChromeAliveEvents from '@ulixee/apps-chromealive-interfaces/events';
import * as WebSocket from 'ws';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import TypeSerializer from '@ulixee/commons/lib/TypeSerializer';
import IChromeAliveEvent from '@ulixee/apps-chromealive-interfaces/events/IChromeAliveEvent';

type IEvent = keyof IChromeAliveEvents;

export default class ChromeAliveApi extends TypedEventEmitter<{ close: void }> {
  private pendingMessagesById = new Map<string, (args: any) => any>();
  private messageCounter = 0;
  private webSocket: WebSocket;

  constructor(
    private chromeAliveServerApi: string,
    public onEvent: (event: IEvent, data?: IChromeAliveEvents[IEvent]) => any,
  ) {
    super();
    process.on('disconnect', () => this.onEvent('App.quit'));
    process.on('message', this.onMessage.bind(this));
  }

  public async connect() {
    const webSocket = new WebSocket(this.chromeAliveServerApi);
    this.webSocket = webSocket;
    this.webSocket.on('close', () => this.emit('close'));
    const result = await new Promise<WebSocket | Error>(resolve => {
      function onError(error: Error): void {
        if (error instanceof Error) resolve(error);
        else resolve(new Error(`Error connecting to Websocket host -> ${error}`));
      }

      webSocket.once('close', onError);
      webSocket.once('error', onError);
      webSocket.once('open', () => {
        webSocket.off('error', onError);
        webSocket.off('close', onError);
        resolve(webSocket);
      });
    });
    if (result instanceof Error) throw result;
    webSocket.on('message', message => {
      const payload = TypeSerializer.parse(message.toString(), 'REMOTE CORE');
      this.onMessage(payload);
    });
  }

  public close() {
    if (this.webSocket?.readyState === WebSocket.OPEN) {
      try {
        this.webSocket.terminate();
      } catch (_) {
        // ignore errors terminating
      }
    }
  }

  public async send<T extends keyof IChromeAliveApis>(
    api: T,
    args: IChromeAliveApis[T]['args'],
  ): Promise<IChromeAliveApis[T]['result']> {
    if (this.webSocket?.readyState !== WebSocket.OPEN) {
      throw new Error('Websocket was not open');
    }

    const messageId = String((this.messageCounter += 1));
    const promise = new Promise(resolve => {
      this.pendingMessagesById.set(messageId, resolve);
    });
    const message = TypeSerializer.stringify({
      api,
      messageId,
      args,
    });

    this.webSocket.send(message);
    const result = await promise;
    if (result instanceof Error) throw result;
    return result;
  }

  private onMessage(message: Serializable) {
    if (message === 'exit') {
      this.onEvent('App.quit');
      return;
    }
    const apiResponse = message as IChromeAliveApiResponse<any>;
    if (apiResponse.responseId) {
      const callback = this.pendingMessagesById.get(apiResponse.responseId);
      this.pendingMessagesById.delete(apiResponse.responseId);
      if (callback) callback(apiResponse.result);
    } else {
      const apiEvent = message as IChromeAliveEvent<any>;
      this.onEvent(apiEvent.eventType, apiEvent.data);
    }
  }
}
