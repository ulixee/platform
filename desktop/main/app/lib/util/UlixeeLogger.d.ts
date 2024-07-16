/// <reference types="node" />
import { ILogEntry, Log } from '@ulixee/commons/lib/Logger';
export default class UlixeeLogger extends Log {
    constructor(module: NodeModule, boundContext?: any);
    protected logToConsole(level: ILogEntry['level'], entry: ILogEntry): void;
    static register(): void;
}
