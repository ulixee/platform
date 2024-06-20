export default class TestMainchain {
    #private;
    ip: string;
    port: string;
    loglevel: string;
    containerName?: string;
    proxy?: string;
    get address(): string;
    constructor(binPath?: string);
    launch(miningThreads?: number): Promise<string>;
    teardown(): Promise<void>;
    private startBitcoin;
}
