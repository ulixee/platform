export default class StaticServer {
    #private;
    constructor(distFolder: string, cacheTime?: number);
    load(): Promise<void>;
    getPath(path: string): string;
}
