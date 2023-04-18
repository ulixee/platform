import TypeSerializer from '@ulixee/commons/lib/TypeSerializer';
import type {
  IChromeAliveSessionApis,
  IDesktopAppApis,
  IDesktopAppPrivateApis,
} from '@ulixee/desktop-interfaces/apis';
import IChromeAliveSessionEvents from '@ulixee/desktop-interfaces/events/IChromeAliveSessionEvents';
import IDesktopAppEvents from '@ulixee/desktop-interfaces/events/IDesktopAppEvents';
import IChromeAliveEvent from '@ulixee/desktop-interfaces/events/IChromeAliveEvent';
import type ICoreResponsePayload from '@ulixee/net/interfaces/ICoreResponsePayload';
import type ICoreRequestPayload from '@ulixee/net/interfaces/ICoreRequestPayload';
import IDesktopAppPrivateEvents from '@ulixee/desktop-interfaces/events/IDesktopAppPrivateEvents';

declare global {
  interface Window {
    setCloudAddress(url: string): void;
    cloudAddress: string | undefined;
    defaultClient: Client;
  }
}

let clientId = 0;
export class Client<Type extends 'session' | 'desktop' | 'internal' = 'session'> {
  public onConnect: () => any;
  public address: string;
  public autoReconnect = true;

  private connectedPromise: Promise<void>;
  private connection: WebSocket;
  private pendingMessagesById = new Map<string, { resolve: (args: any) => any }>();

  private messageCounter = 0;
  private eventHandlersByEventType: {
    [event: string]: ((message: any) => any)[];
  } = {};

  private lastEventByEventType: { [event: string]: any } = {};

  private id = (clientId += 1);

  constructor(address?: string) {
    this.connect = this.connect.bind(this);
    this.send = this.send.bind(this);
    this.address ??= address;
  }

  connect(): Promise<void> {
    if (this.connectedPromise) {
      return this.connectedPromise;
    }
    if (!this.address) {
      return Promise.resolve();
    }
    this.connection = new WebSocket(this.address);
    this.connection.onclose = this.onClose.bind(this);
    this.connectedPromise = new Promise(resolve => {
      this.connection.onopen = () => {
        window.addEventListener('beforeunload', () => {
          this.connection?.close();
        });
        resolve();
      };
    });
    this.connection.onmessage = this.emit.bind(this);
    return this.connectedPromise.then(this.onConnect);
  }

  on<
    T extends keyof TEvents & string,
    TEvents extends Type extends 'session'
      ? IChromeAliveSessionEvents
      : Type extends 'desktop'
      ? IDesktopAppEvents
      : IDesktopAppPrivateEvents = Type extends 'session'
      ? IChromeAliveSessionEvents
      : Type extends 'desktop'
      ? IDesktopAppEvents
      : IDesktopAppPrivateEvents,
  >(event: T, handler: (message: TEvents[T]) => any): void {
    this.eventHandlersByEventType[event] ??= [];
    this.eventHandlersByEventType[event].push(handler);
    const lastEvent = this.lastEventByEventType[event];
    if (lastEvent) handler(lastEvent);
  }

  off<
    T extends keyof TEvents & string,
    TEvents extends Type extends 'session'
      ? IChromeAliveSessionEvents
      : Type extends 'desktop'
      ? IDesktopAppEvents
      : IDesktopAppPrivateEvents = Type extends 'session'
      ? IChromeAliveSessionEvents
      : Type extends 'desktop'
      ? IDesktopAppEvents
      : IDesktopAppPrivateEvents,
  >(event: T, handler: (message: TEvents[T]) => any): void {
    const handlers = this.eventHandlersByEventType[event];
    if (!handlers) return;
    const idx = handlers.indexOf(handler);
    if (idx >= 0) handlers.splice(idx, 1);
  }

  removeEventListeners<
    T extends keyof TEvents & string,
    TEvents extends Type extends 'session'
      ? IChromeAliveSessionEvents
      : Type extends 'desktop'
      ? IDesktopAppEvents
      : IDesktopAppPrivateEvents = Type extends 'session'
      ? IChromeAliveSessionEvents
      : Type extends 'desktop'
      ? IDesktopAppEvents
      : IDesktopAppPrivateEvents,
  >(event: T): void {
    delete this.eventHandlersByEventType[event];
  }

  close() {
    try {
      this.connection?.close();
    } catch {}
    this.connection = null;
  }

  onClose() {
    this.connectedPromise = null;
    if (!this.autoReconnect) {
      this.eventHandlersByEventType = {};
      return;
    }
    setTimeout(() => {
      this.address ||= window.cloudAddress;
      this.connect().catch(err => console.log('Client Connect Error', err));
    }, 1e3);
  }

  async send<
    T extends keyof TApis & string,
    TApis extends Type extends 'session'
      ? IChromeAliveSessionApis
      : Type extends 'desktop'
      ? IDesktopAppApis
      : IDesktopAppPrivateApis = Type extends 'session'
      ? IChromeAliveSessionApis
      : Type extends 'desktop'
      ? IDesktopAppApis
      : IDesktopAppPrivateApis,
  >(
    command: T,
    ...args: ICoreRequestPayload<TApis, T>['args']
  ): Promise<ICoreResponsePayload<TApis, T>['data']> {
    if (!this.connectedPromise) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return this.send(command, ...args);
    }
    await this.connectedPromise;
    this.messageCounter += 1;
    const messageId = String(this.messageCounter);

    const message = TypeSerializer.stringify(<ICoreRequestPayload<TApis, T>>{
      command,
      messageId,
      args,
    });

    document.dispatchEvent(
      new CustomEvent('chromealive:api', {
        detail: { command, messageId, args, clientId: this.id },
      }),
    );
    return new Promise(resolve => {
      this.pendingMessagesById.set(messageId, { resolve });
      this.connection.send(message);
    });
  }

  private emit<
    TApis extends Type extends 'session'
      ? IChromeAliveSessionApis
      : IDesktopAppApis = Type extends 'session' ? IChromeAliveSessionApis : IDesktopAppApis,
  >(message: { eventType?: string; data: string }): void {
    const event: IChromeAliveEvent<any> | ICoreResponsePayload<TApis, any> = TypeSerializer.parse(
      message.data,
    );
    if ('eventType' in event) {
      this.lastEventByEventType[event.eventType as string] = event.data;
      for (const handler of this.eventHandlersByEventType[event.eventType as string] ?? []) {
        handler(event.data);
      }
      document.dispatchEvent(
        new CustomEvent('chromealive:event', {
          detail: event,
        }),
      );
    } else {
      const { responseId, data } = event;
      this.pendingMessagesById.get(responseId)?.resolve(data);
      this.pendingMessagesById.delete(responseId);
      document.dispatchEvent(
        new CustomEvent('chromealive:api:response', {
          detail: { responseId, data, clientId: this.id },
        }),
      );
    }
  }
}

window.cloudAddress ??= '';

// eslint-disable-next-line import/no-mutable-exports
let defaultClient: Client;
if (window.opener) {
  defaultClient = window.opener.defaultClient;
} else {
  defaultClient = new Client();
}

window.setCloudAddress = function setCloudAddress(url: string) {
  window.cloudAddress = url;
  defaultClient.address = url;
  defaultClient.connect().catch(console.error);
};

// if already set, connect now
if (window.cloudAddress) {
  window.setCloudAddress(window.cloudAddress);
}
window.defaultClient = defaultClient;

export default defaultClient;
