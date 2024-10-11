import { ExtractSchemaType } from '@ulixee/schema';
import Table from './Table';
export default class CreditsTable extends Table<typeof CreditsSchema> {
    static tableName: "ulx_credits";
    constructor();
    create(microgons: number, secret?: string): Promise<{
        id: string;
        secret: string;
        remainingCredits: number;
    }>;
    get(id: string): Promise<Omit<ICredit, 'salt' | 'secretHash'>>;
    summary(): Promise<{
        count: number;
        microgons: number;
    }>;
    debit(id: string, secret: string, amount: number): Promise<number>;
    finalize(id: string, refund: number): Promise<void>;
    private getUpstreamCreditLimit;
}
export declare const CreditsSchema: {
    id: import("@ulixee/schema/lib/StringSchema").default<false>;
    salt: import("@ulixee/schema/lib/StringSchema").default<false>;
    secretHash: import("@ulixee/schema/lib/BufferSchema").default<false>;
    issuedCredits: import("@ulixee/schema/lib/NumberSchema").default<false>;
    remainingCredits: import("@ulixee/schema/lib/NumberSchema").default<false>;
};
type ICredit = ExtractSchemaType<typeof CreditsSchema>;
export {};
