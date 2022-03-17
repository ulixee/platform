import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import IChromeAliveEvent from '@ulixee/apps-chromealive-interfaces/events/IChromeAliveEvent';
import IChromeAliveEvents from '@ulixee/apps-chromealive-interfaces/events';
import {
  IChromeAliveApis,
  IChromeAliveApiRequest,
  IChromeAliveApiResponse,
} from '@ulixee/apps-chromealive-interfaces/apis';
import Log from '@ulixee/commons/lib/Logger';
import Apis from '../apis';

const { log } = Log(module);

export default class ConnectionToClient extends TypedEventEmitter<{
  message: IChromeAliveApiResponse<any> | IChromeAliveEvent<any>;
  close: void;
}> {
  public async handleRequest<T extends keyof IChromeAliveApis>(
    apiRequest: IChromeAliveApiRequest<T>,
  ): Promise<void> {
    const { args, api, messageId } = apiRequest;

    let result: any;
    try {
      const handler = Apis[api];
      if (!handler) throw new Error(`Unknown api requested: ${api}`);
      result = await handler(args as any);
    } catch (error) {
      log.error('Error running api', { error, sessionId: (args as any)?.heroSessionId });
      result = error;
    }

    const response: IChromeAliveApiResponse<T> = {
      responseId: messageId,
      result,
    };
    this.emit('message', response);
  }

  public close(): void {
    this.emit('close');
  }

  public sendEvent<T extends keyof IChromeAliveEvents>(event: IChromeAliveEvent<T>): void {
    this.emit('message', event);
  }
}
