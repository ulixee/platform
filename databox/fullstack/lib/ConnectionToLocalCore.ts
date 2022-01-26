import Core from '@ulixee/databox-core';
import { ConnectionToCore } from '@ulixee/databox';
import ICoreRequestPayload from '@ulixee/databox-interfaces/ICoreRequestPayload';
import ConnectionToClient from '@ulixee/databox-core/connections/ConnectionToClient';
import TypeSerializer from '@ulixee/commons/lib/TypeSerializer';

export default class ConnectionToLocalCore extends ConnectionToCore {
  public static shouldSerialize = false;

  #connectionToClient: ConnectionToClient;

  protected async internalSendRequest(payload: ICoreRequestPayload): Promise<void> {
    if (ConnectionToLocalCore.shouldSerialize) {
      const json = TypeSerializer.stringify(payload);
      payload = TypeSerializer.parse(json.toString(), 'CLIENT');
    }
    await this.#connectionToClient.handleRequest(payload);
  }

  protected async destroyConnection(): Promise<any> {
    await this.#connectionToClient.disconnect();
  }

  protected async createConnection(): Promise<Error | null> {
    this.#connectionToClient = Core.addConnection();
    this.#connectionToClient.on('message', payload => {
      if (ConnectionToLocalCore.shouldSerialize) {
        const message = TypeSerializer.stringify(payload);
        payload = TypeSerializer.parse(message.toString(), 'LOCAL CORE');
      }
      this.onMessage(payload);
    });
    return await new Promise(resolve => setTimeout(resolve, 0));
  }
}
