/// <reference types="node" />
import { z } from 'zod';
export declare const DataDomainSchema: z.ZodTuple<[z.ZodEffects<z.ZodEffects<z.ZodType<Buffer, z.ZodTypeDef, Buffer>, Buffer, Buffer>, Buffer, unknown>, z.ZodString], null>;
export declare const BlockVoteSchema: z.ZodObject<{
    accountId: z.ZodString;
    blockHash: z.ZodEffects<z.ZodEffects<z.ZodType<Buffer, z.ZodTypeDef, Buffer>, Buffer, Buffer>, Buffer, unknown>;
    index: z.ZodNumber;
    power: z.ZodEffects<z.ZodBigInt, bigint, unknown>;
    dataDomainHash: z.ZodEffects<z.ZodEffects<z.ZodType<Buffer, z.ZodTypeDef, Buffer>, Buffer, Buffer>, Buffer, unknown>;
    dataDomainAccount: z.ZodString;
}, "strip", z.ZodTypeAny, {
    dataDomainHash: Buffer;
    accountId: string;
    blockHash: Buffer;
    index: number;
    power: bigint;
    dataDomainAccount: string;
}, {
    accountId: string;
    index: number;
    dataDomainAccount: string;
    blockHash?: unknown;
    power?: unknown;
    dataDomainHash?: unknown;
}>;
export declare const NotarizationSchema: z.ZodObject<{
    balanceChanges: z.ZodArray<z.ZodObject<{
        accountId: z.ZodString;
        accountType: z.ZodNativeEnum<typeof import("./IBalanceChange").AccountType>;
        changeNumber: z.ZodNumber;
        balance: z.ZodEffects<z.ZodBigInt, bigint, unknown>;
        previousBalanceProof: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            notaryId: z.ZodNumber;
            notebookNumber: z.ZodNumber;
            tick: z.ZodNumber;
            balance: z.ZodEffects<z.ZodBigInt, bigint, unknown>;
            accountOrigin: z.ZodObject<{
                notebookNumber: z.ZodNumber;
                accountUid: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                notebookNumber: number;
                accountUid: number;
            }, {
                notebookNumber: number;
                accountUid: number;
            }>;
            notebookProof: z.ZodOptional<z.ZodNullable<z.ZodObject<{
                proof: z.ZodArray<z.ZodType<Uint8Array, z.ZodTypeDef, Uint8Array>, "many">;
                numberOfLeaves: z.ZodNumber;
                leafIndex: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                proof: Uint8Array[];
                numberOfLeaves: number;
                leafIndex: number;
            }, {
                proof: Uint8Array[];
                numberOfLeaves: number;
                leafIndex: number;
            }>>>;
        }, "strip", z.ZodTypeAny, {
            balance: bigint;
            notebookNumber: number;
            notaryId: number;
            tick: number;
            accountOrigin: {
                notebookNumber: number;
                accountUid: number;
            };
            notebookProof?: {
                proof: Uint8Array[];
                numberOfLeaves: number;
                leafIndex: number;
            } | null | undefined;
        }, {
            notebookNumber: number;
            notaryId: number;
            tick: number;
            accountOrigin: {
                notebookNumber: number;
                accountUid: number;
            };
            balance?: unknown;
            notebookProof?: {
                proof: Uint8Array[];
                numberOfLeaves: number;
                leafIndex: number;
            } | null | undefined;
        }>>>;
        escrowHoldNote: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            milligons: z.ZodEffects<z.ZodBigInt, bigint, unknown>;
            noteType: z.ZodDiscriminatedUnion<"action", [z.ZodObject<{
                action: z.ZodLiteral<"sendToMainchain">;
            }, z.UnknownKeysParam, z.ZodTypeAny, {
                action: "sendToMainchain";
            }, {
                action: "sendToMainchain";
            }>, z.ZodObject<{
                action: z.ZodLiteral<"claimFromMainchain">;
                transferId: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                action: "claimFromMainchain";
                transferId: number;
            }, {
                action: "claimFromMainchain";
                transferId: number;
            }>, z.ZodObject<{
                action: z.ZodLiteral<"claim">;
            }, z.UnknownKeysParam, z.ZodTypeAny, {
                action: "claim";
            }, {
                action: "claim";
            }>, z.ZodObject<{
                action: z.ZodLiteral<"send">;
                to: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>>;
            }, "strip", z.ZodTypeAny, {
                action: "send";
                to?: string[] | null | undefined;
            }, {
                action: "send";
                to?: string[] | null | undefined;
            }>, z.ZodObject<{
                action: z.ZodLiteral<"leaseDomain">;
            }, z.UnknownKeysParam, z.ZodTypeAny, {
                action: "leaseDomain";
            }, {
                action: "leaseDomain";
            }>, z.ZodObject<{
                action: z.ZodLiteral<"fee">;
            }, z.UnknownKeysParam, z.ZodTypeAny, {
                action: "fee";
            }, {
                action: "fee";
            }>, z.ZodObject<{
                action: z.ZodLiteral<"tax">;
            }, z.UnknownKeysParam, z.ZodTypeAny, {
                action: "tax";
            }, {
                action: "tax";
            }>, z.ZodObject<{
                action: z.ZodLiteral<"sendToVote">;
            }, z.UnknownKeysParam, z.ZodTypeAny, {
                action: "sendToVote";
            }, {
                action: "sendToVote";
            }>, z.ZodObject<{
                action: z.ZodLiteral<"escrowHold">;
                recipient: z.ZodString;
                dataDomainHash: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodType<Buffer, z.ZodTypeDef, Buffer>, Buffer, Buffer>, Buffer, unknown>>>>;
                delegatedSigner: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
            }, "strip", z.ZodTypeAny, {
                action: "escrowHold";
                recipient: string;
                dataDomainHash?: Buffer | null | undefined;
                delegatedSigner?: string | null | undefined;
            }, {
                action: "escrowHold";
                recipient: string;
                dataDomainHash?: unknown;
                delegatedSigner?: string | null | undefined;
            }>, z.ZodObject<{
                action: z.ZodLiteral<"escrowSettle">;
            }, z.UnknownKeysParam, z.ZodTypeAny, {
                action: "escrowSettle";
            }, {
                action: "escrowSettle";
            }>, z.ZodObject<{
                action: z.ZodLiteral<"escrowClaim">;
            }, z.UnknownKeysParam, z.ZodTypeAny, {
                action: "escrowClaim";
            }, {
                action: "escrowClaim";
            }>]>;
        }, "strip", z.ZodTypeAny, {
            milligons: bigint;
            noteType: {
                action: "send";
                to?: string[] | null | undefined;
            } | {
                action: "claimFromMainchain";
                transferId: number;
            } | {
                action: "escrowHold";
                recipient: string;
                dataDomainHash?: Buffer | null | undefined;
                delegatedSigner?: string | null | undefined;
            } | {
                action: "sendToMainchain";
            } | {
                action: "claim";
            } | {
                action: "leaseDomain";
            } | {
                action: "fee";
            } | {
                action: "tax";
            } | {
                action: "sendToVote";
            } | {
                action: "escrowSettle";
            } | {
                action: "escrowClaim";
            };
        }, {
            noteType: {
                action: "send";
                to?: string[] | null | undefined;
            } | {
                action: "claimFromMainchain";
                transferId: number;
            } | {
                action: "escrowHold";
                recipient: string;
                dataDomainHash?: unknown;
                delegatedSigner?: string | null | undefined;
            } | {
                action: "sendToMainchain";
            } | {
                action: "claim";
            } | {
                action: "leaseDomain";
            } | {
                action: "fee";
            } | {
                action: "tax";
            } | {
                action: "sendToVote";
            } | {
                action: "escrowSettle";
            } | {
                action: "escrowClaim";
            };
            milligons?: unknown;
        }>>>;
        notes: z.ZodArray<z.ZodObject<{
            milligons: z.ZodEffects<z.ZodBigInt, bigint, unknown>;
            noteType: z.ZodDiscriminatedUnion<"action", [z.ZodObject<{
                action: z.ZodLiteral<"sendToMainchain">;
            }, z.UnknownKeysParam, z.ZodTypeAny, {
                action: "sendToMainchain";
            }, {
                action: "sendToMainchain";
            }>, z.ZodObject<{
                action: z.ZodLiteral<"claimFromMainchain">;
                transferId: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                action: "claimFromMainchain";
                transferId: number;
            }, {
                action: "claimFromMainchain";
                transferId: number;
            }>, z.ZodObject<{
                action: z.ZodLiteral<"claim">;
            }, z.UnknownKeysParam, z.ZodTypeAny, {
                action: "claim";
            }, {
                action: "claim";
            }>, z.ZodObject<{
                action: z.ZodLiteral<"send">;
                to: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>>;
            }, "strip", z.ZodTypeAny, {
                action: "send";
                to?: string[] | null | undefined;
            }, {
                action: "send";
                to?: string[] | null | undefined;
            }>, z.ZodObject<{
                action: z.ZodLiteral<"leaseDomain">;
            }, z.UnknownKeysParam, z.ZodTypeAny, {
                action: "leaseDomain";
            }, {
                action: "leaseDomain";
            }>, z.ZodObject<{
                action: z.ZodLiteral<"fee">;
            }, z.UnknownKeysParam, z.ZodTypeAny, {
                action: "fee";
            }, {
                action: "fee";
            }>, z.ZodObject<{
                action: z.ZodLiteral<"tax">;
            }, z.UnknownKeysParam, z.ZodTypeAny, {
                action: "tax";
            }, {
                action: "tax";
            }>, z.ZodObject<{
                action: z.ZodLiteral<"sendToVote">;
            }, z.UnknownKeysParam, z.ZodTypeAny, {
                action: "sendToVote";
            }, {
                action: "sendToVote";
            }>, z.ZodObject<{
                action: z.ZodLiteral<"escrowHold">;
                recipient: z.ZodString;
                dataDomainHash: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodType<Buffer, z.ZodTypeDef, Buffer>, Buffer, Buffer>, Buffer, unknown>>>>;
                delegatedSigner: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
            }, "strip", z.ZodTypeAny, {
                action: "escrowHold";
                recipient: string;
                dataDomainHash?: Buffer | null | undefined;
                delegatedSigner?: string | null | undefined;
            }, {
                action: "escrowHold";
                recipient: string;
                dataDomainHash?: unknown;
                delegatedSigner?: string | null | undefined;
            }>, z.ZodObject<{
                action: z.ZodLiteral<"escrowSettle">;
            }, z.UnknownKeysParam, z.ZodTypeAny, {
                action: "escrowSettle";
            }, {
                action: "escrowSettle";
            }>, z.ZodObject<{
                action: z.ZodLiteral<"escrowClaim">;
            }, z.UnknownKeysParam, z.ZodTypeAny, {
                action: "escrowClaim";
            }, {
                action: "escrowClaim";
            }>]>;
        }, "strip", z.ZodTypeAny, {
            milligons: bigint;
            noteType: {
                action: "send";
                to?: string[] | null | undefined;
            } | {
                action: "claimFromMainchain";
                transferId: number;
            } | {
                action: "escrowHold";
                recipient: string;
                dataDomainHash?: Buffer | null | undefined;
                delegatedSigner?: string | null | undefined;
            } | {
                action: "sendToMainchain";
            } | {
                action: "claim";
            } | {
                action: "leaseDomain";
            } | {
                action: "fee";
            } | {
                action: "tax";
            } | {
                action: "sendToVote";
            } | {
                action: "escrowSettle";
            } | {
                action: "escrowClaim";
            };
        }, {
            noteType: {
                action: "send";
                to?: string[] | null | undefined;
            } | {
                action: "claimFromMainchain";
                transferId: number;
            } | {
                action: "escrowHold";
                recipient: string;
                dataDomainHash?: unknown;
                delegatedSigner?: string | null | undefined;
            } | {
                action: "sendToMainchain";
            } | {
                action: "claim";
            } | {
                action: "leaseDomain";
            } | {
                action: "fee";
            } | {
                action: "tax";
            } | {
                action: "sendToVote";
            } | {
                action: "escrowSettle";
            } | {
                action: "escrowClaim";
            };
            milligons?: unknown;
        }>, "many">;
        signature: z.ZodEffects<z.ZodEffects<z.ZodType<Buffer, z.ZodTypeDef, Buffer>, Buffer, Buffer>, Buffer, unknown>;
    }, "strip", z.ZodTypeAny, {
        balance: bigint;
        accountId: string;
        accountType: import("./IBalanceChange").AccountType;
        changeNumber: number;
        notes: {
            milligons: bigint;
            noteType: {
                action: "send";
                to?: string[] | null | undefined;
            } | {
                action: "claimFromMainchain";
                transferId: number;
            } | {
                action: "escrowHold";
                recipient: string;
                dataDomainHash?: Buffer | null | undefined;
                delegatedSigner?: string | null | undefined;
            } | {
                action: "sendToMainchain";
            } | {
                action: "claim";
            } | {
                action: "leaseDomain";
            } | {
                action: "fee";
            } | {
                action: "tax";
            } | {
                action: "sendToVote";
            } | {
                action: "escrowSettle";
            } | {
                action: "escrowClaim";
            };
        }[];
        signature: Buffer;
        previousBalanceProof?: {
            balance: bigint;
            notebookNumber: number;
            notaryId: number;
            tick: number;
            accountOrigin: {
                notebookNumber: number;
                accountUid: number;
            };
            notebookProof?: {
                proof: Uint8Array[];
                numberOfLeaves: number;
                leafIndex: number;
            } | null | undefined;
        } | null | undefined;
        escrowHoldNote?: {
            milligons: bigint;
            noteType: {
                action: "send";
                to?: string[] | null | undefined;
            } | {
                action: "claimFromMainchain";
                transferId: number;
            } | {
                action: "escrowHold";
                recipient: string;
                dataDomainHash?: Buffer | null | undefined;
                delegatedSigner?: string | null | undefined;
            } | {
                action: "sendToMainchain";
            } | {
                action: "claim";
            } | {
                action: "leaseDomain";
            } | {
                action: "fee";
            } | {
                action: "tax";
            } | {
                action: "sendToVote";
            } | {
                action: "escrowSettle";
            } | {
                action: "escrowClaim";
            };
        } | null | undefined;
    }, {
        accountId: string;
        accountType: import("./IBalanceChange").AccountType;
        changeNumber: number;
        notes: {
            noteType: {
                action: "send";
                to?: string[] | null | undefined;
            } | {
                action: "claimFromMainchain";
                transferId: number;
            } | {
                action: "escrowHold";
                recipient: string;
                dataDomainHash?: unknown;
                delegatedSigner?: string | null | undefined;
            } | {
                action: "sendToMainchain";
            } | {
                action: "claim";
            } | {
                action: "leaseDomain";
            } | {
                action: "fee";
            } | {
                action: "tax";
            } | {
                action: "sendToVote";
            } | {
                action: "escrowSettle";
            } | {
                action: "escrowClaim";
            };
            milligons?: unknown;
        }[];
        balance?: unknown;
        previousBalanceProof?: {
            notebookNumber: number;
            notaryId: number;
            tick: number;
            accountOrigin: {
                notebookNumber: number;
                accountUid: number;
            };
            balance?: unknown;
            notebookProof?: {
                proof: Uint8Array[];
                numberOfLeaves: number;
                leafIndex: number;
            } | null | undefined;
        } | null | undefined;
        escrowHoldNote?: {
            noteType: {
                action: "send";
                to?: string[] | null | undefined;
            } | {
                action: "claimFromMainchain";
                transferId: number;
            } | {
                action: "escrowHold";
                recipient: string;
                dataDomainHash?: unknown;
                delegatedSigner?: string | null | undefined;
            } | {
                action: "sendToMainchain";
            } | {
                action: "claim";
            } | {
                action: "leaseDomain";
            } | {
                action: "fee";
            } | {
                action: "tax";
            } | {
                action: "sendToVote";
            } | {
                action: "escrowSettle";
            } | {
                action: "escrowClaim";
            };
            milligons?: unknown;
        } | null | undefined;
        signature?: unknown;
    }>, "many">;
    blockVotes: z.ZodArray<z.ZodObject<{
        accountId: z.ZodString;
        blockHash: z.ZodEffects<z.ZodEffects<z.ZodType<Buffer, z.ZodTypeDef, Buffer>, Buffer, Buffer>, Buffer, unknown>;
        index: z.ZodNumber;
        power: z.ZodEffects<z.ZodBigInt, bigint, unknown>;
        dataDomainHash: z.ZodEffects<z.ZodEffects<z.ZodType<Buffer, z.ZodTypeDef, Buffer>, Buffer, Buffer>, Buffer, unknown>;
        dataDomainAccount: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        dataDomainHash: Buffer;
        accountId: string;
        blockHash: Buffer;
        index: number;
        power: bigint;
        dataDomainAccount: string;
    }, {
        accountId: string;
        index: number;
        dataDomainAccount: string;
        blockHash?: unknown;
        power?: unknown;
        dataDomainHash?: unknown;
    }>, "many">;
    dataDomains: z.ZodArray<z.ZodTuple<[z.ZodEffects<z.ZodEffects<z.ZodType<Buffer, z.ZodTypeDef, Buffer>, Buffer, Buffer>, Buffer, unknown>, z.ZodString], null>, "many">;
}, "strip", z.ZodTypeAny, {
    balanceChanges: {
        balance: bigint;
        accountId: string;
        accountType: import("./IBalanceChange").AccountType;
        changeNumber: number;
        notes: {
            milligons: bigint;
            noteType: {
                action: "send";
                to?: string[] | null | undefined;
            } | {
                action: "claimFromMainchain";
                transferId: number;
            } | {
                action: "escrowHold";
                recipient: string;
                dataDomainHash?: Buffer | null | undefined;
                delegatedSigner?: string | null | undefined;
            } | {
                action: "sendToMainchain";
            } | {
                action: "claim";
            } | {
                action: "leaseDomain";
            } | {
                action: "fee";
            } | {
                action: "tax";
            } | {
                action: "sendToVote";
            } | {
                action: "escrowSettle";
            } | {
                action: "escrowClaim";
            };
        }[];
        signature: Buffer;
        previousBalanceProof?: {
            balance: bigint;
            notebookNumber: number;
            notaryId: number;
            tick: number;
            accountOrigin: {
                notebookNumber: number;
                accountUid: number;
            };
            notebookProof?: {
                proof: Uint8Array[];
                numberOfLeaves: number;
                leafIndex: number;
            } | null | undefined;
        } | null | undefined;
        escrowHoldNote?: {
            milligons: bigint;
            noteType: {
                action: "send";
                to?: string[] | null | undefined;
            } | {
                action: "claimFromMainchain";
                transferId: number;
            } | {
                action: "escrowHold";
                recipient: string;
                dataDomainHash?: Buffer | null | undefined;
                delegatedSigner?: string | null | undefined;
            } | {
                action: "sendToMainchain";
            } | {
                action: "claim";
            } | {
                action: "leaseDomain";
            } | {
                action: "fee";
            } | {
                action: "tax";
            } | {
                action: "sendToVote";
            } | {
                action: "escrowSettle";
            } | {
                action: "escrowClaim";
            };
        } | null | undefined;
    }[];
    blockVotes: {
        dataDomainHash: Buffer;
        accountId: string;
        blockHash: Buffer;
        index: number;
        power: bigint;
        dataDomainAccount: string;
    }[];
    dataDomains: [Buffer, string][];
}, {
    balanceChanges: {
        accountId: string;
        accountType: import("./IBalanceChange").AccountType;
        changeNumber: number;
        notes: {
            noteType: {
                action: "send";
                to?: string[] | null | undefined;
            } | {
                action: "claimFromMainchain";
                transferId: number;
            } | {
                action: "escrowHold";
                recipient: string;
                dataDomainHash?: unknown;
                delegatedSigner?: string | null | undefined;
            } | {
                action: "sendToMainchain";
            } | {
                action: "claim";
            } | {
                action: "leaseDomain";
            } | {
                action: "fee";
            } | {
                action: "tax";
            } | {
                action: "sendToVote";
            } | {
                action: "escrowSettle";
            } | {
                action: "escrowClaim";
            };
            milligons?: unknown;
        }[];
        balance?: unknown;
        previousBalanceProof?: {
            notebookNumber: number;
            notaryId: number;
            tick: number;
            accountOrigin: {
                notebookNumber: number;
                accountUid: number;
            };
            balance?: unknown;
            notebookProof?: {
                proof: Uint8Array[];
                numberOfLeaves: number;
                leafIndex: number;
            } | null | undefined;
        } | null | undefined;
        escrowHoldNote?: {
            noteType: {
                action: "send";
                to?: string[] | null | undefined;
            } | {
                action: "claimFromMainchain";
                transferId: number;
            } | {
                action: "escrowHold";
                recipient: string;
                dataDomainHash?: unknown;
                delegatedSigner?: string | null | undefined;
            } | {
                action: "sendToMainchain";
            } | {
                action: "claim";
            } | {
                action: "leaseDomain";
            } | {
                action: "fee";
            } | {
                action: "tax";
            } | {
                action: "sendToVote";
            } | {
                action: "escrowSettle";
            } | {
                action: "escrowClaim";
            };
            milligons?: unknown;
        } | null | undefined;
        signature?: unknown;
    }[];
    blockVotes: {
        accountId: string;
        index: number;
        dataDomainAccount: string;
        blockHash?: unknown;
        power?: unknown;
        dataDomainHash?: unknown;
    }[];
    dataDomains: [unknown, string][];
}>;
type INotarization = z.infer<typeof NotarizationSchema>;
export default INotarization;
