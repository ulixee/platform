import TypedEventEmitter from '@ulixee/commons/lib/TypedEventEmitter';
import ITransport from '@ulixee/net/interfaces/ITransport';
import { IKadApiTypes } from '@ulixee/platform-specification/cloud/KadApis';
import INodeInfo from '@ulixee/platform-specification/types/INodeInfo';
import NodeId from '../interfaces/NodeId';
import ConnectionToKadClient from './ConnectionToKadClient';
import ConnectionToKadCore from './ConnectionToKadCore';
import type { Kad } from './Kad';
export declare class Network extends TypedEventEmitter<{
    peer: INodeInfo;
}> {
    private readonly kad;
    get connections(): number;
    private readonly logger;
    private running;
    private connectionsByNodeId;
    private connectionsByBlindDialHost;
    constructor(kad: Kad);
    start(): Promise<void>;
    stop(): Promise<void>;
    isStarted(): boolean;
    sendRequest<T extends keyof IKadApiTypes & string>(to: INodeInfo, command: T, args: IKadApiTypes[T]['args'], options?: {
        timeoutMs?: number;
        signal?: AbortSignal;
    }): Promise<IKadApiTypes[T]['result'] & {
        fromNodeId: NodeId;
    }>;
    blindDial(address: string, options?: {
        timeoutMs?: number;
        signal?: AbortSignal;
    }): Promise<ConnectionToKadCore>;
    dial(address: string, nodeId: string, options?: {
        timeoutMs?: number;
        signal?: AbortSignal;
    }): Promise<ConnectionToKadCore>;
    addConnectionToClient(transport: ITransport): Promise<ConnectionToKadClient>;
    private trackConnection;
}
