import Resolvable from '@ulixee/commons/lib/Resolvable';
import { ConnectionToCore } from '@ulixee/net';
import ITransport from '@ulixee/net/interfaces/ITransport';
import { IKadApis } from '@ulixee/platform-specification/cloud/KadApis';
import INodeInfo from '@ulixee/platform-specification/types/INodeInfo';
import ConnectionToKadClient from './ConnectionToKadClient';
import { Kad } from './Kad';
export default class ConnectionToKadCore extends ConnectionToCore<IKadApis, {}> {
    private kad;
    nodeInfo: INodeInfo;
    verifiedPromise: Resolvable<void>;
    constructor(kad: Kad, transportToCore: ITransport);
    connectAndVerify(connectToNodeId: string, timeoutMs?: number): Promise<void>;
    toClient(): ConnectionToKadClient;
    static fromClient(kad: Kad, client: ConnectionToKadClient): ConnectionToKadCore;
    static parseUrl(address: string): string;
}
