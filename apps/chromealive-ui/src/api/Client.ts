import TypeSerializer from '@ulixee/commons/lib/TypeSerializer';
import type {
  IChromeAliveApis,
  IChromeAliveApiRequest,
  IChromeAliveApiResponse,
} from '@ulixee/apps-chromealive-interfaces/apis';
import IChromeAliveEvents from '@ulixee/apps-chromealive-interfaces/events';
import IChromeAliveEvent from '@ulixee/apps-chromealive-interfaces/events/IChromeAliveEvent';

type EventType = keyof IChromeAliveEvents;

declare global {
  interface Window {
    setHeroServerUrl(url: string): void;
    heroServerUrl: string | undefined;
    defaultClient: Client;
  }
}

class Client {
  public onConnect: () => any;

  private connectedPromise: Promise<void>;
  private connection: WebSocket;
  private pendingMessagesById = new Map<string, { resolve: (args: any) => any }>();
  private messageCounter = 0;
  private eventHandlersByEventType: { [event: string]: ((message: any) => any)[] } = {};
  private lastEventByEventType: { [event: string]: any } = {};

  connect(): Promise<void> {
    if (this.connectedPromise) {
      return this.connectedPromise;
    }
    if (!window.heroServerUrl) {
      return Promise.resolve();
    }
    this.connection = new WebSocket(window.heroServerUrl);
    this.connection.onclose = this.onClose.bind(this);
    this.connectedPromise = new Promise(resolve => {
      this.connection.onopen = () => resolve();
    });
    this.connection.onmessage = this.emit.bind(this);
    return this.connectedPromise.then(this.onConnect);
  }

  on<T extends EventType>(event: T, handler: (message: IChromeAliveEvents[T]) => any): void {
    this.eventHandlersByEventType[event] ??= [];
    this.eventHandlersByEventType[event].push(handler);
    const lastEvent = this.lastEventByEventType[event];
    if (lastEvent) handler(lastEvent);
  }

  off<T extends EventType>(event: T, handler: (message: IChromeAliveEvents[T]) => any): void {
    const handlers = this.eventHandlersByEventType[event];
    if (!handlers) return;
    const idx = handlers.indexOf(handler);
    if (idx >= 0) handlers.splice(idx, 1);
  }

  onClose() {
    this.connectedPromise = null;
    setTimeout(() => {
      this.connect().catch(err => console.log('Client Connect Error', err));
    }, 1e3);
  }

  async send<T extends keyof IChromeAliveApis>(
    api: T,
    args?: IChromeAliveApis[T]['args'],
  ): Promise<IChromeAliveApis[T]['result']> {
    if (!this.connectedPromise) {
      setTimeout(() => this.send(api, args), 500);
      return;
    }
    await this.connectedPromise;
    this.messageCounter += 1;
    const messageId = String(this.messageCounter);

    const message = TypeSerializer.stringify(<IChromeAliveApiRequest<T>>{
      api,
      messageId,
      args,
    });
    document.dispatchEvent(
      new CustomEvent('chromealive:api', {
        detail: { api, messageId, args },
      }),
    );
    return new Promise<IChromeAliveApis[T]['result']>(resolve => {
      this.connection.send(message);
      this.pendingMessagesById.set(messageId, { resolve });
    });
  }

  private emit(message: { data: string }): void {
    const event: IChromeAliveEvent<any> | IChromeAliveApiResponse<any> = TypeSerializer.parse(
      message.data,
    );

    if ('eventType' in event) {
      this.lastEventByEventType[event.eventType] = event.data;
      for (const handler of this.eventHandlersByEventType[event.eventType] ?? []) {
        handler(event.data);
      }
      document.dispatchEvent(
        new CustomEvent('chromealive:event', {
          detail: event,
        }),
      );
    } else {
      const { responseId, result } = event;
      this.pendingMessagesById.get(responseId)?.resolve(result);
      this.pendingMessagesById.delete(responseId);
    }
  }
}

window.heroServerUrl = process.env.VUE_APP_BASE_URI ?? '';

// eslint-disable-next-line import/no-mutable-exports
let defaultClient: Client;
if (window.opener) {
  defaultClient = window.opener.defaultClient;
} else {
  defaultClient = new Client();
}

window.setHeroServerUrl = function setHeroServerUrl(url: string) {
  window.heroServerUrl = url;
  defaultClient.connect().catch(console.error);
};

// if already set, connect now
if (window.heroServerUrl) {
  defaultClient.connect().catch(console.error);
}
window.defaultClient = defaultClient;

export default defaultClient;
