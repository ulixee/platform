import TypeSerializer from '@ulixee/commons/lib/TypeSerializer';
import type ICoreRequestPayload from '@ulixee/net/interfaces/ICoreRequestPayload';
import type ICoreResponsePayload from '@ulixee/net/interfaces/ICoreResponsePayload';
import { IDatabrokerAdminApis } from '@ulixee/platform-specification/datastore';

export class Client {
  private connectedPromise?: Promise<void>;
  private connection?: WebSocket;
  private pendingMessagesById = new Map<
    string,
    { resolve: (args: any) => any; reject: (err: Error) => any }
  >();

  private messageCounter = 0;

  constructor() {
    this.connect = this.connect.bind(this);
    this.send = this.send.bind(this);
  }

  connect(): Promise<void> {
    if (this.connectedPromise) {
      return this.connectedPromise;
    }
    this.connection = new WebSocket('/');
    this.connection.onclose = this.onClose.bind(this);
    this.connection.onmessage = this.onMessage.bind(this);
    this.connectedPromise = new Promise((resolve, reject) => {
      this.connection!.onopen = () => resolve();
      this.connection!.onerror = err => reject(err);
    });
    return this.connectedPromise;
  }

  onClose() {
    this.connectedPromise = undefined;
  }

  async send<T extends keyof TApis & string, TApis extends IDatabrokerAdminApis>(
    command: T,
    ...args: ICoreRequestPayload<TApis, T>['args']
  ): Promise<ICoreResponsePayload<TApis, T>['data']> {
    if (!this.connectedPromise) {
      await new Promise(resolve => setTimeout(resolve, 500));
      await this.connect();
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

    return new Promise((resolve, reject) => {
      this.pendingMessagesById.set(messageId, { resolve, reject });
      this.connection!.send(message);
    });
  }

  private onMessage<TApis extends IDatabrokerAdminApis>(message: {
    eventType?: string;
    data: string;
  }): void {
    const event: ICoreResponsePayload<TApis, any> = TypeSerializer.parse(message.data);
    if ('eventType' in event) {
      console.log('event emitted', event);
    } else {
      const { responseId, data } = event;
      const pending = this.pendingMessagesById.get(responseId);
      this.pendingMessagesById.delete(responseId);
      if (pending) {
        if ((data as any) instanceof Error) {
          pending.reject(data);
        } else pending.resolve(data);
      }
    }
  }
}

export default new Client();
