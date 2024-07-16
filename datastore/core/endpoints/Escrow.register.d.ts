/// <reference types="node" />
import ValidatingApiHandler from '@ulixee/platform-specification/utils/ValidatingApiHandler';
import IDatastoreApiContext from '../interfaces/IDatastoreApiContext';
declare const _default: ValidatingApiHandler<{
    'Escrow.register': {
        args: import("zod").ZodObject<{
            datastoreId: import("zod").ZodString;
            escrow: import("zod").ZodObject<{
                balance: import("zod").ZodEffects<import("zod").ZodBigInt, bigint, unknown>;
                accountId: import("zod").ZodString;
                accountType: import("zod").ZodNativeEnum<typeof import("@ulixee/platform-specification/types/IBalanceChange").AccountType>;
                changeNumber: import("zod").ZodNumber;
                previousBalanceProof: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodObject<{
                    notaryId: import("zod").ZodNumber;
                    notebookNumber: import("zod").ZodNumber;
                    tick: import("zod").ZodNumber;
                    balance: import("zod").ZodEffects<import("zod").ZodBigInt, bigint, unknown>;
                    accountOrigin: import("zod").ZodObject<{
                        notebookNumber: import("zod").ZodNumber;
                        accountUid: import("zod").ZodNumber;
                    }, "strip", import("zod").ZodTypeAny, {
                        notebookNumber: number;
                        accountUid: number;
                    }, {
                        notebookNumber: number;
                        accountUid: number;
                    }>;
                    notebookProof: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodObject<{
                        proof: import("zod").ZodArray<import("zod").ZodType<Uint8Array, import("zod").ZodTypeDef, Uint8Array>, "many">;
                        numberOfLeaves: import("zod").ZodNumber;
                        leafIndex: import("zod").ZodNumber;
                    }, "strip", import("zod").ZodTypeAny, {
                        proof: Uint8Array[];
                        numberOfLeaves: number;
                        leafIndex: number;
                    }, {
                        proof: Uint8Array[];
                        numberOfLeaves: number;
                        leafIndex: number;
                    }>>>;
                }, "strip", import("zod").ZodTypeAny, {
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
                    };
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
                    };
                }>>>;
                notes: import("zod").ZodArray<import("zod").ZodObject<{
                    milligons: import("zod").ZodEffects<import("zod").ZodBigInt, bigint, unknown>;
                    noteType: import("zod").ZodDiscriminatedUnion<"action", [import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"sendToMainchain">;
                    }, import("zod").UnknownKeysParam, import("zod").ZodTypeAny, {
                        action: "sendToMainchain";
                    }, {
                        action: "sendToMainchain";
                    }>, import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"claimFromMainchain">;
                        transferId: import("zod").ZodNumber;
                    }, "strip", import("zod").ZodTypeAny, {
                        action: "claimFromMainchain";
                        transferId: number;
                    }, {
                        action: "claimFromMainchain";
                        transferId: number;
                    }>, import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"claim">;
                    }, import("zod").UnknownKeysParam, import("zod").ZodTypeAny, {
                        action: "claim";
                    }, {
                        action: "claim";
                    }>, import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"send">;
                        to: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>>>;
                    }, "strip", import("zod").ZodTypeAny, {
                        action: "send";
                        to?: string[];
                    }, {
                        action: "send";
                        to?: string[];
                    }>, import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"leaseDomain">;
                    }, import("zod").UnknownKeysParam, import("zod").ZodTypeAny, {
                        action: "leaseDomain";
                    }, {
                        action: "leaseDomain";
                    }>, import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"fee">;
                    }, import("zod").UnknownKeysParam, import("zod").ZodTypeAny, {
                        action: "fee";
                    }, {
                        action: "fee";
                    }>, import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"tax">;
                    }, import("zod").UnknownKeysParam, import("zod").ZodTypeAny, {
                        action: "tax";
                    }, {
                        action: "tax";
                    }>, import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"sendToVote">;
                    }, import("zod").UnknownKeysParam, import("zod").ZodTypeAny, {
                        action: "sendToVote";
                    }, {
                        action: "sendToVote";
                    }>, import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"escrowHold">;
                        recipient: import("zod").ZodString;
                        dataDomainHash: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodOptional<import("zod").ZodEffects<import("zod").ZodEffects<import("zod").ZodType<Buffer, import("zod").ZodTypeDef, Buffer>, Buffer, Buffer>, Buffer, unknown>>>>;
                        delegatedSigner: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodOptional<import("zod").ZodString>>>;
                    }, "strip", import("zod").ZodTypeAny, {
                        action: "escrowHold";
                        recipient: string;
                        dataDomainHash?: Buffer;
                        delegatedSigner?: string;
                    }, {
                        action: "escrowHold";
                        recipient: string;
                        dataDomainHash?: unknown;
                        delegatedSigner?: string;
                    }>, import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"escrowSettle">;
                    }, import("zod").UnknownKeysParam, import("zod").ZodTypeAny, {
                        action: "escrowSettle";
                    }, {
                        action: "escrowSettle";
                    }>, import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"escrowClaim">;
                    }, import("zod").UnknownKeysParam, import("zod").ZodTypeAny, {
                        action: "escrowClaim";
                    }, {
                        action: "escrowClaim";
                    }>]>;
                }, "strip", import("zod").ZodTypeAny, {
                    milligons: bigint;
                    noteType: {
                        action: "send";
                        to?: string[];
                    } | {
                        action: "claimFromMainchain";
                        transferId: number;
                    } | {
                        action: "escrowHold";
                        recipient: string;
                        dataDomainHash?: Buffer;
                        delegatedSigner?: string;
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
                        to?: string[];
                    } | {
                        action: "claimFromMainchain";
                        transferId: number;
                    } | {
                        action: "escrowHold";
                        recipient: string;
                        dataDomainHash?: unknown;
                        delegatedSigner?: string;
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
                signature: import("zod").ZodEffects<import("zod").ZodEffects<import("zod").ZodType<Buffer, import("zod").ZodTypeDef, Buffer>, Buffer, Buffer>, Buffer, unknown>;
                escrowHoldNote: import("zod").ZodObject<{
                    milligons: import("zod").ZodEffects<import("zod").ZodBigInt, bigint, unknown>;
                    noteType: import("zod").ZodDiscriminatedUnion<"action", [import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"sendToMainchain">;
                    }, import("zod").UnknownKeysParam, import("zod").ZodTypeAny, {
                        action: "sendToMainchain";
                    }, {
                        action: "sendToMainchain";
                    }>, import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"claimFromMainchain">;
                        transferId: import("zod").ZodNumber;
                    }, "strip", import("zod").ZodTypeAny, {
                        action: "claimFromMainchain";
                        transferId: number;
                    }, {
                        action: "claimFromMainchain";
                        transferId: number;
                    }>, import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"claim">;
                    }, import("zod").UnknownKeysParam, import("zod").ZodTypeAny, {
                        action: "claim";
                    }, {
                        action: "claim";
                    }>, import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"send">;
                        to: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>>>;
                    }, "strip", import("zod").ZodTypeAny, {
                        action: "send";
                        to?: string[];
                    }, {
                        action: "send";
                        to?: string[];
                    }>, import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"leaseDomain">;
                    }, import("zod").UnknownKeysParam, import("zod").ZodTypeAny, {
                        action: "leaseDomain";
                    }, {
                        action: "leaseDomain";
                    }>, import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"fee">;
                    }, import("zod").UnknownKeysParam, import("zod").ZodTypeAny, {
                        action: "fee";
                    }, {
                        action: "fee";
                    }>, import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"tax">;
                    }, import("zod").UnknownKeysParam, import("zod").ZodTypeAny, {
                        action: "tax";
                    }, {
                        action: "tax";
                    }>, import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"sendToVote">;
                    }, import("zod").UnknownKeysParam, import("zod").ZodTypeAny, {
                        action: "sendToVote";
                    }, {
                        action: "sendToVote";
                    }>, import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"escrowHold">;
                        recipient: import("zod").ZodString;
                        dataDomainHash: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodOptional<import("zod").ZodEffects<import("zod").ZodEffects<import("zod").ZodType<Buffer, import("zod").ZodTypeDef, Buffer>, Buffer, Buffer>, Buffer, unknown>>>>;
                        delegatedSigner: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodOptional<import("zod").ZodString>>>;
                    }, "strip", import("zod").ZodTypeAny, {
                        action: "escrowHold";
                        recipient: string;
                        dataDomainHash?: Buffer;
                        delegatedSigner?: string;
                    }, {
                        action: "escrowHold";
                        recipient: string;
                        dataDomainHash?: unknown;
                        delegatedSigner?: string;
                    }>, import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"escrowSettle">;
                    }, import("zod").UnknownKeysParam, import("zod").ZodTypeAny, {
                        action: "escrowSettle";
                    }, {
                        action: "escrowSettle";
                    }>, import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"escrowClaim">;
                    }, import("zod").UnknownKeysParam, import("zod").ZodTypeAny, {
                        action: "escrowClaim";
                    }, {
                        action: "escrowClaim";
                    }>]>;
                }, "strip", import("zod").ZodTypeAny, {
                    milligons: bigint;
                    noteType: {
                        action: "send";
                        to?: string[];
                    } | {
                        action: "claimFromMainchain";
                        transferId: number;
                    } | {
                        action: "escrowHold";
                        recipient: string;
                        dataDomainHash?: Buffer;
                        delegatedSigner?: string;
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
                        to?: string[];
                    } | {
                        action: "claimFromMainchain";
                        transferId: number;
                    } | {
                        action: "escrowHold";
                        recipient: string;
                        dataDomainHash?: unknown;
                        delegatedSigner?: string;
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
                }>;
            }, "strip", import("zod").ZodTypeAny, {
                balance: bigint;
                accountId: string;
                accountType: import("@ulixee/platform-specification/types/IBalanceChange").AccountType;
                changeNumber: number;
                escrowHoldNote: {
                    milligons: bigint;
                    noteType: {
                        action: "send";
                        to?: string[];
                    } | {
                        action: "claimFromMainchain";
                        transferId: number;
                    } | {
                        action: "escrowHold";
                        recipient: string;
                        dataDomainHash?: Buffer;
                        delegatedSigner?: string;
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
                };
                notes: {
                    milligons: bigint;
                    noteType: {
                        action: "send";
                        to?: string[];
                    } | {
                        action: "claimFromMainchain";
                        transferId: number;
                    } | {
                        action: "escrowHold";
                        recipient: string;
                        dataDomainHash?: Buffer;
                        delegatedSigner?: string;
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
                    };
                };
            }, {
                accountId: string;
                accountType: import("@ulixee/platform-specification/types/IBalanceChange").AccountType;
                changeNumber: number;
                escrowHoldNote: {
                    noteType: {
                        action: "send";
                        to?: string[];
                    } | {
                        action: "claimFromMainchain";
                        transferId: number;
                    } | {
                        action: "escrowHold";
                        recipient: string;
                        dataDomainHash?: unknown;
                        delegatedSigner?: string;
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
                };
                notes: {
                    noteType: {
                        action: "send";
                        to?: string[];
                    } | {
                        action: "claimFromMainchain";
                        transferId: number;
                    } | {
                        action: "escrowHold";
                        recipient: string;
                        dataDomainHash?: unknown;
                        delegatedSigner?: string;
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
                    };
                };
                signature?: unknown;
            }>;
        }, "strip", import("zod").ZodTypeAny, {
            escrow: {
                balance: bigint;
                accountId: string;
                accountType: import("@ulixee/platform-specification/types/IBalanceChange").AccountType;
                changeNumber: number;
                escrowHoldNote: {
                    milligons: bigint;
                    noteType: {
                        action: "send";
                        to?: string[];
                    } | {
                        action: "claimFromMainchain";
                        transferId: number;
                    } | {
                        action: "escrowHold";
                        recipient: string;
                        dataDomainHash?: Buffer;
                        delegatedSigner?: string;
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
                };
                notes: {
                    milligons: bigint;
                    noteType: {
                        action: "send";
                        to?: string[];
                    } | {
                        action: "claimFromMainchain";
                        transferId: number;
                    } | {
                        action: "escrowHold";
                        recipient: string;
                        dataDomainHash?: Buffer;
                        delegatedSigner?: string;
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
                    };
                };
            };
            datastoreId: string;
        }, {
            escrow: {
                accountId: string;
                accountType: import("@ulixee/platform-specification/types/IBalanceChange").AccountType;
                changeNumber: number;
                escrowHoldNote: {
                    noteType: {
                        action: "send";
                        to?: string[];
                    } | {
                        action: "claimFromMainchain";
                        transferId: number;
                    } | {
                        action: "escrowHold";
                        recipient: string;
                        dataDomainHash?: unknown;
                        delegatedSigner?: string;
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
                };
                notes: {
                    noteType: {
                        action: "send";
                        to?: string[];
                    } | {
                        action: "claimFromMainchain";
                        transferId: number;
                    } | {
                        action: "escrowHold";
                        recipient: string;
                        dataDomainHash?: unknown;
                        delegatedSigner?: string;
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
                    };
                };
                signature?: unknown;
            };
            datastoreId: string;
        }>;
        result: import("zod").ZodObject<{
            accepted: import("zod").ZodBoolean;
        }, "strip", import("zod").ZodTypeAny, {
            accepted: boolean;
        }, {
            accepted: boolean;
        }>;
    };
}, "Escrow.register", import("@ulixee/platform-specification/utils/IZodApi").IZodSchemaToApiTypes<{
    'Escrow.register': {
        args: import("zod").ZodObject<{
            datastoreId: import("zod").ZodString;
            escrow: import("zod").ZodObject<{
                balance: import("zod").ZodEffects<import("zod").ZodBigInt, bigint, unknown>;
                accountId: import("zod").ZodString;
                accountType: import("zod").ZodNativeEnum<typeof import("@ulixee/platform-specification/types/IBalanceChange").AccountType>;
                changeNumber: import("zod").ZodNumber;
                previousBalanceProof: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodObject<{
                    notaryId: import("zod").ZodNumber;
                    notebookNumber: import("zod").ZodNumber;
                    tick: import("zod").ZodNumber;
                    balance: import("zod").ZodEffects<import("zod").ZodBigInt, bigint, unknown>;
                    accountOrigin: import("zod").ZodObject<{
                        notebookNumber: import("zod").ZodNumber;
                        accountUid: import("zod").ZodNumber;
                    }, "strip", import("zod").ZodTypeAny, {
                        notebookNumber: number;
                        accountUid: number;
                    }, {
                        notebookNumber: number;
                        accountUid: number;
                    }>;
                    notebookProof: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodObject<{
                        proof: import("zod").ZodArray<import("zod").ZodType<Uint8Array, import("zod").ZodTypeDef, Uint8Array>, "many">;
                        numberOfLeaves: import("zod").ZodNumber;
                        leafIndex: import("zod").ZodNumber;
                    }, "strip", import("zod").ZodTypeAny, {
                        proof: Uint8Array[];
                        numberOfLeaves: number;
                        leafIndex: number;
                    }, {
                        proof: Uint8Array[];
                        numberOfLeaves: number;
                        leafIndex: number;
                    }>>>;
                }, "strip", import("zod").ZodTypeAny, {
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
                    };
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
                    };
                }>>>;
                notes: import("zod").ZodArray<import("zod").ZodObject<{
                    milligons: import("zod").ZodEffects<import("zod").ZodBigInt, bigint, unknown>;
                    noteType: import("zod").ZodDiscriminatedUnion<"action", [import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"sendToMainchain">;
                    }, import("zod").UnknownKeysParam, import("zod").ZodTypeAny, {
                        action: "sendToMainchain";
                    }, {
                        action: "sendToMainchain";
                    }>, import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"claimFromMainchain">;
                        transferId: import("zod").ZodNumber;
                    }, "strip", import("zod").ZodTypeAny, {
                        action: "claimFromMainchain";
                        transferId: number;
                    }, {
                        action: "claimFromMainchain";
                        transferId: number;
                    }>, import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"claim">;
                    }, import("zod").UnknownKeysParam, import("zod").ZodTypeAny, {
                        action: "claim";
                    }, {
                        action: "claim";
                    }>, import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"send">;
                        to: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>>>;
                    }, "strip", import("zod").ZodTypeAny, {
                        action: "send";
                        to?: string[];
                    }, {
                        action: "send";
                        to?: string[];
                    }>, import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"leaseDomain">;
                    }, import("zod").UnknownKeysParam, import("zod").ZodTypeAny, {
                        action: "leaseDomain";
                    }, {
                        action: "leaseDomain";
                    }>, import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"fee">;
                    }, import("zod").UnknownKeysParam, import("zod").ZodTypeAny, {
                        action: "fee";
                    }, {
                        action: "fee";
                    }>, import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"tax">;
                    }, import("zod").UnknownKeysParam, import("zod").ZodTypeAny, {
                        action: "tax";
                    }, {
                        action: "tax";
                    }>, import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"sendToVote">;
                    }, import("zod").UnknownKeysParam, import("zod").ZodTypeAny, {
                        action: "sendToVote";
                    }, {
                        action: "sendToVote";
                    }>, import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"escrowHold">;
                        recipient: import("zod").ZodString;
                        dataDomainHash: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodOptional<import("zod").ZodEffects<import("zod").ZodEffects<import("zod").ZodType<Buffer, import("zod").ZodTypeDef, Buffer>, Buffer, Buffer>, Buffer, unknown>>>>;
                        delegatedSigner: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodOptional<import("zod").ZodString>>>;
                    }, "strip", import("zod").ZodTypeAny, {
                        action: "escrowHold";
                        recipient: string;
                        dataDomainHash?: Buffer;
                        delegatedSigner?: string;
                    }, {
                        action: "escrowHold";
                        recipient: string;
                        dataDomainHash?: unknown;
                        delegatedSigner?: string;
                    }>, import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"escrowSettle">;
                    }, import("zod").UnknownKeysParam, import("zod").ZodTypeAny, {
                        action: "escrowSettle";
                    }, {
                        action: "escrowSettle";
                    }>, import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"escrowClaim">;
                    }, import("zod").UnknownKeysParam, import("zod").ZodTypeAny, {
                        action: "escrowClaim";
                    }, {
                        action: "escrowClaim";
                    }>]>;
                }, "strip", import("zod").ZodTypeAny, {
                    milligons: bigint;
                    noteType: {
                        action: "send";
                        to?: string[];
                    } | {
                        action: "claimFromMainchain";
                        transferId: number;
                    } | {
                        action: "escrowHold";
                        recipient: string;
                        dataDomainHash?: Buffer;
                        delegatedSigner?: string;
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
                        to?: string[];
                    } | {
                        action: "claimFromMainchain";
                        transferId: number;
                    } | {
                        action: "escrowHold";
                        recipient: string;
                        dataDomainHash?: unknown;
                        delegatedSigner?: string;
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
                signature: import("zod").ZodEffects<import("zod").ZodEffects<import("zod").ZodType<Buffer, import("zod").ZodTypeDef, Buffer>, Buffer, Buffer>, Buffer, unknown>;
                escrowHoldNote: import("zod").ZodObject<{
                    milligons: import("zod").ZodEffects<import("zod").ZodBigInt, bigint, unknown>;
                    noteType: import("zod").ZodDiscriminatedUnion<"action", [import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"sendToMainchain">;
                    }, import("zod").UnknownKeysParam, import("zod").ZodTypeAny, {
                        action: "sendToMainchain";
                    }, {
                        action: "sendToMainchain";
                    }>, import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"claimFromMainchain">;
                        transferId: import("zod").ZodNumber;
                    }, "strip", import("zod").ZodTypeAny, {
                        action: "claimFromMainchain";
                        transferId: number;
                    }, {
                        action: "claimFromMainchain";
                        transferId: number;
                    }>, import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"claim">;
                    }, import("zod").UnknownKeysParam, import("zod").ZodTypeAny, {
                        action: "claim";
                    }, {
                        action: "claim";
                    }>, import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"send">;
                        to: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>>>;
                    }, "strip", import("zod").ZodTypeAny, {
                        action: "send";
                        to?: string[];
                    }, {
                        action: "send";
                        to?: string[];
                    }>, import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"leaseDomain">;
                    }, import("zod").UnknownKeysParam, import("zod").ZodTypeAny, {
                        action: "leaseDomain";
                    }, {
                        action: "leaseDomain";
                    }>, import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"fee">;
                    }, import("zod").UnknownKeysParam, import("zod").ZodTypeAny, {
                        action: "fee";
                    }, {
                        action: "fee";
                    }>, import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"tax">;
                    }, import("zod").UnknownKeysParam, import("zod").ZodTypeAny, {
                        action: "tax";
                    }, {
                        action: "tax";
                    }>, import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"sendToVote">;
                    }, import("zod").UnknownKeysParam, import("zod").ZodTypeAny, {
                        action: "sendToVote";
                    }, {
                        action: "sendToVote";
                    }>, import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"escrowHold">;
                        recipient: import("zod").ZodString;
                        dataDomainHash: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodOptional<import("zod").ZodEffects<import("zod").ZodEffects<import("zod").ZodType<Buffer, import("zod").ZodTypeDef, Buffer>, Buffer, Buffer>, Buffer, unknown>>>>;
                        delegatedSigner: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodOptional<import("zod").ZodString>>>;
                    }, "strip", import("zod").ZodTypeAny, {
                        action: "escrowHold";
                        recipient: string;
                        dataDomainHash?: Buffer;
                        delegatedSigner?: string;
                    }, {
                        action: "escrowHold";
                        recipient: string;
                        dataDomainHash?: unknown;
                        delegatedSigner?: string;
                    }>, import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"escrowSettle">;
                    }, import("zod").UnknownKeysParam, import("zod").ZodTypeAny, {
                        action: "escrowSettle";
                    }, {
                        action: "escrowSettle";
                    }>, import("zod").ZodObject<{
                        action: import("zod").ZodLiteral<"escrowClaim">;
                    }, import("zod").UnknownKeysParam, import("zod").ZodTypeAny, {
                        action: "escrowClaim";
                    }, {
                        action: "escrowClaim";
                    }>]>;
                }, "strip", import("zod").ZodTypeAny, {
                    milligons: bigint;
                    noteType: {
                        action: "send";
                        to?: string[];
                    } | {
                        action: "claimFromMainchain";
                        transferId: number;
                    } | {
                        action: "escrowHold";
                        recipient: string;
                        dataDomainHash?: Buffer;
                        delegatedSigner?: string;
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
                        to?: string[];
                    } | {
                        action: "claimFromMainchain";
                        transferId: number;
                    } | {
                        action: "escrowHold";
                        recipient: string;
                        dataDomainHash?: unknown;
                        delegatedSigner?: string;
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
                }>;
            }, "strip", import("zod").ZodTypeAny, {
                balance: bigint;
                accountId: string;
                accountType: import("@ulixee/platform-specification/types/IBalanceChange").AccountType;
                changeNumber: number;
                escrowHoldNote: {
                    milligons: bigint;
                    noteType: {
                        action: "send";
                        to?: string[];
                    } | {
                        action: "claimFromMainchain";
                        transferId: number;
                    } | {
                        action: "escrowHold";
                        recipient: string;
                        dataDomainHash?: Buffer;
                        delegatedSigner?: string;
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
                };
                notes: {
                    milligons: bigint;
                    noteType: {
                        action: "send";
                        to?: string[];
                    } | {
                        action: "claimFromMainchain";
                        transferId: number;
                    } | {
                        action: "escrowHold";
                        recipient: string;
                        dataDomainHash?: Buffer;
                        delegatedSigner?: string;
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
                    };
                };
            }, {
                accountId: string;
                accountType: import("@ulixee/platform-specification/types/IBalanceChange").AccountType;
                changeNumber: number;
                escrowHoldNote: {
                    noteType: {
                        action: "send";
                        to?: string[];
                    } | {
                        action: "claimFromMainchain";
                        transferId: number;
                    } | {
                        action: "escrowHold";
                        recipient: string;
                        dataDomainHash?: unknown;
                        delegatedSigner?: string;
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
                };
                notes: {
                    noteType: {
                        action: "send";
                        to?: string[];
                    } | {
                        action: "claimFromMainchain";
                        transferId: number;
                    } | {
                        action: "escrowHold";
                        recipient: string;
                        dataDomainHash?: unknown;
                        delegatedSigner?: string;
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
                    };
                };
                signature?: unknown;
            }>;
        }, "strip", import("zod").ZodTypeAny, {
            escrow: {
                balance: bigint;
                accountId: string;
                accountType: import("@ulixee/platform-specification/types/IBalanceChange").AccountType;
                changeNumber: number;
                escrowHoldNote: {
                    milligons: bigint;
                    noteType: {
                        action: "send";
                        to?: string[];
                    } | {
                        action: "claimFromMainchain";
                        transferId: number;
                    } | {
                        action: "escrowHold";
                        recipient: string;
                        dataDomainHash?: Buffer;
                        delegatedSigner?: string;
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
                };
                notes: {
                    milligons: bigint;
                    noteType: {
                        action: "send";
                        to?: string[];
                    } | {
                        action: "claimFromMainchain";
                        transferId: number;
                    } | {
                        action: "escrowHold";
                        recipient: string;
                        dataDomainHash?: Buffer;
                        delegatedSigner?: string;
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
                    };
                };
            };
            datastoreId: string;
        }, {
            escrow: {
                accountId: string;
                accountType: import("@ulixee/platform-specification/types/IBalanceChange").AccountType;
                changeNumber: number;
                escrowHoldNote: {
                    noteType: {
                        action: "send";
                        to?: string[];
                    } | {
                        action: "claimFromMainchain";
                        transferId: number;
                    } | {
                        action: "escrowHold";
                        recipient: string;
                        dataDomainHash?: unknown;
                        delegatedSigner?: string;
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
                };
                notes: {
                    noteType: {
                        action: "send";
                        to?: string[];
                    } | {
                        action: "claimFromMainchain";
                        transferId: number;
                    } | {
                        action: "escrowHold";
                        recipient: string;
                        dataDomainHash?: unknown;
                        delegatedSigner?: string;
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
                    };
                };
                signature?: unknown;
            };
            datastoreId: string;
        }>;
        result: import("zod").ZodObject<{
            accepted: import("zod").ZodBoolean;
        }, "strip", import("zod").ZodTypeAny, {
            accepted: boolean;
        }, {
            accepted: boolean;
        }>;
    };
}>, IDatastoreApiContext>;
export default _default;
