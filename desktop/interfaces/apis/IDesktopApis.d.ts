import type { ICredit } from '@ulixee/datastore/lib/CreditsStore';
export interface IUserBalance {
    address: string;
    walletBalance: string;
    centagonsBalance: number;
    credits: ICredit[];
}
export interface ICloudConnected {
    type: 'local' | 'public' | 'private';
    name: string;
    address: string;
    adminIdentity?: string;
    cloudNodes: number;
    oldAddress?: string;
}
