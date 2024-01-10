import { IPayment } from '@ulixee/platform-specification';
export default class CreditsStore {
    static storePath: string;
    private static creditsByDatastore;
    static storeFromUrl(url: string, microgons: number): Promise<void>;
    static store(datastoreId: string, datastoreVersion: string, host: string, credits: {
        id: string;
        secret: string;
        remainingCredits: number;
    }): Promise<void>;
    static getPayment(datastoreId: string, datastoreVersion: string, microgons: number): Promise<(IPayment & {
        onFinalized(result: {
            microgons: number;
            bytes: number;
        }): void;
    }) | undefined>;
    static asList(): Promise<ICredit[]>;
    protected static finalizePayment(originalMicrogons: number, credits: ICreditsStore[0][0], result: {
        microgons: number;
        bytes: number;
    }): void;
    private static load;
    private static writeToDisk;
}
interface ICreditsStore {
    [datastoreId_Version: string]: {
        [creditsId: string]: {
            secret: string;
            host: string;
            remainingCredits: number;
            allocated: number;
        };
    };
}
export declare type ICredit = {
    datastoreId: string;
    datastoreVersion: string;
    remainingBalance: number;
    allocated: number;
    creditsId: string;
    host: string;
};
export {};
