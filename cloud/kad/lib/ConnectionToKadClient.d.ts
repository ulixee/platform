import { IBoundLog } from '@ulixee/commons/interfaces/ILog';
import Resolvable from '@ulixee/commons/lib/Resolvable';
import { ConnectionToClient } from '@ulixee/net';
import ITransport from '@ulixee/net/interfaces/ITransport';
import { IKadApis } from '@ulixee/platform-specification/cloud/KadApis';
import INodeInfo from '@ulixee/platform-specification/types/INodeInfo';
import { Kad } from './Kad';
export default class ConnectionToKadClient extends ConnectionToClient<IKadApis, {}> {
    kad: Kad;
    private static apiHandlers;
    nodeInfo: INodeInfo;
    presharedNonce: string;
    ourNonce: string;
    verifiedPromise: Resolvable<void>;
    logger: IBoundLog;
    constructor(kad: Kad, transport: ITransport);
}
