export default class TestCloudNode {
    #private;
    private rootDir;
    address: string;
    constructor(rootDir?: string);
    start(envArgs: Record<string, string>): Promise<string>;
    close(): Promise<void>;
}
