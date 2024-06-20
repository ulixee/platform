import { Client } from 'pg';
import { KeyringPair, UlxClient } from '@ulixee/mainchain';
export default class TestNotary {
    #private;
    operator: KeyringPair;
    ip: string;
    registeredPublicKey: Uint8Array;
    port: string;
    containerName?: string;
    proxy?: string;
    logLevel: string;
    get address(): string;
    constructor(dbConnectionString?: string);
    /**
     * Returns the localhost address of the notary (NOTE: not accessible from containers)
     */
    start(mainchainUrl: string, pathToNotaryBin?: string): Promise<string>;
    register(client: UlxClient): Promise<void>;
    teardown(): Promise<void>;
    connect(): Promise<Client>;
}
