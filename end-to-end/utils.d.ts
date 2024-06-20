/// <reference types="node" />
import { ChildProcess, ExecSyncOptions } from 'child_process';
export declare function getCloudAddress(cloudNodeProcess: ChildProcess): Promise<string>;
export declare function execAndLog(command: string, options?: ExecSyncOptions): string;
