import Resolvable from '@ulixee/commons/lib/Resolvable';
import type { Kad } from './Kad';
export interface IQuerySelfInit {
    count?: number;
    interval?: number;
    initialInterval?: number;
    queryTimeout?: number;
    initialQuerySelfHasRun: Resolvable<void>;
}
/**
 * Receives notifications of new peers joining the network that support the DHT protocol
 */
export declare class QuerySelf {
    private readonly kad;
    private readonly logger;
    private readonly count;
    private readonly interval;
    private readonly initialInterval;
    private readonly queryTimeout;
    private started;
    private timeoutId?;
    private controller?;
    private initialQuerySelfHasRun?;
    private querySelfPromise;
    constructor(kad: Kad, init: IQuerySelfInit);
    isStarted(): boolean;
    start(): Promise<void>;
    stop(): Promise<void>;
    querySelf(): Promise<void>;
    private schedule;
}
