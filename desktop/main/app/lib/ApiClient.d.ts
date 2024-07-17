import { IChromeAliveSessionApis, IDesktopAppApis } from '@ulixee/desktop-interfaces/apis';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import ITransport from '@ulixee/net/interfaces/ITransport';
import ICoreResponsePayload from '@ulixee/net/interfaces/ICoreResponsePayload';
import ICoreRequestPayload from '@ulixee/net/interfaces/ICoreRequestPayload';
import IChromeAliveSessionEvents from '@ulixee/desktop-interfaces/events/IChromeAliveSessionEvents';
import IDesktopAppEvents from '@ulixee/desktop-interfaces/events/IDesktopAppEvents';
export default class ApiClient<TApis extends IDesktopAppApis | IChromeAliveSessionApis, TEvents extends IChromeAliveSessionEvents | IDesktopAppEvents, TEventNames extends keyof TEvents = keyof TEvents> extends TypedEventEmitter<{
    close: void;
}> {
    onEvent: (event: TEventNames, data?: TEvents[TEventNames]) => any;
    isConnected: boolean;
    address: string;
    readonly transport: ITransport;
    private connection;
    constructor(address: string, onEvent: (event: TEventNames, data?: TEvents[TEventNames]) => any);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    send<T extends keyof TApis & string>(command: T, ...args: ICoreRequestPayload<TApis, T>['args']): Promise<ICoreResponsePayload<TApis, T>['data']>;
    private onDisconnected;
    private onMessage;
}
