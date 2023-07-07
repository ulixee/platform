import { IBoundLog } from '@ulixee/commons/interfaces/ILog';
import Logger from '@ulixee/commons/lib/Logger';
import Resolvable from '@ulixee/commons/lib/Resolvable';
import { ConnectionToClient } from '@ulixee/net';
import ITransport from '@ulixee/net/interfaces/ITransport';
import ApiRegistry from '@ulixee/net/lib/ApiRegistry';
import { IKadApis } from '@ulixee/platform-specification/cloud/KadApis';
import INodeInfo from '@ulixee/platform-specification/types/INodeInfo';
import KadConnect from '../endpoints/Kad.connect';
import KadFindNode from '../endpoints/Kad.findNode';
import KadFindProviders from '../endpoints/Kad.findProviders';
import KadGet from '../endpoints/Kad.get';
import KadPing from '../endpoints/Kad.ping';
import KadProvide from '../endpoints/Kad.provide';
import KadPut from '../endpoints/Kad.put';
import KadVerify from '../endpoints/Kad.verify';
import IKadApiContext from '../interfaces/IKadApiContext';
import { Kad } from './Kad';

const { log } = Logger(module);

export default class ConnectionToKadClient extends ConnectionToClient<IKadApis, {}> {
  private static apiHandlers = new ApiRegistry<IKadApiContext>([
    KadProvide,
    KadConnect,
    KadFindNode,
    KadFindProviders,
    KadPing,
    KadVerify,
    KadPut,
    KadGet,
  ]).handlersByCommand as IKadApis;

  public nodeInfo: INodeInfo;
  public presharedNonce: string;
  public ourNonce: string;
  public verifiedPromise = new Resolvable<void>();

  public logger: IBoundLog;

  constructor(public kad: Kad, transport: ITransport) {
    super(transport, ConnectionToKadClient.apiHandlers);

    this.logger = log.createChild(module, { remoteId: transport.remoteId });

    this.handlerMetadata = {
      connection: this,
      kad: this.kad,
      logger: this.logger,
    };
    this.on('response', ({ response, request, metadata }) => {
      this.logger.info(`kad/${request.command} (${request.messageId})`, {
        args: request.args?.[0],
        response: response.data,
        ...metadata,
      });
    });
  }
}
