/// <reference types="node" />
import { z } from 'zod';
import { IZodSchemaToApiTypes } from '../utils/IZodApi';
export declare const EscrowApisSchema: {
    'Escrow.register': {
        args: z.ZodObject<{
            datastoreId: z.ZodString;
            escrow: z.ZodObject<{
                signature: z.ZodEffects<z.ZodEffects<z.ZodType<Buffer, z.ZodTypeDef, Buffer>, Buffer, Buffer>, Buffer, unknown>;
                balance: z.ZodEffects<z.ZodBigInt, bigint, unknown>;
                accountId: z.ZodString;
                accountType: z.ZodNativeEnum<typeof import("../types/IBalanceChange").AccountType>;
                changeNumber: z.ZodNumber;
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
                    notaryId: number;
                    balance: bigint;
                    notebookNumber: number;
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
                    notaryId: number;
                    notebookNumber: number;
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
                    }, "strip", z.ZodTypeAny, {
                        action: "escrowHold";
                        recipient: string;
                        dataDomainHash?: Buffer | null | undefined;
                    }, {
                        action: "escrowHold";
                        recipient: string;
                        dataDomainHash?: unknown;
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
                escrowHoldNote: z.ZodObject<{
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
                    }, "strip", z.ZodTypeAny, {
                        action: "escrowHold";
                        recipient: string;
                        dataDomainHash?: Buffer | null | undefined;
                    }, {
                        action: "escrowHold";
                        recipient: string;
                        dataDomainHash?: unknown;
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
            }, "strip", z.ZodTypeAny, {
                signature: Buffer;
                balance: bigint;
                accountId: string;
                accountType: import("../types/IBalanceChange").AccountType;
                changeNumber: number;
                escrowHoldNote: {
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
                        to?: string[] | null | undefined;
                    } | {
                        action: "claimFromMainchain";
                        transferId: number;
                    } | {
                        action: "escrowHold";
                        recipient: string;
                        dataDomainHash?: Buffer | null | undefined;
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
                previousBalanceProof?: {
                    notaryId: number;
                    balance: bigint;
                    notebookNumber: number;
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
            }, {
                accountId: string;
                accountType: import("../types/IBalanceChange").AccountType;
                changeNumber: number;
                escrowHoldNote: {
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
                        to?: string[] | null | undefined;
                    } | {
                        action: "claimFromMainchain";
                        transferId: number;
                    } | {
                        action: "escrowHold";
                        recipient: string;
                        dataDomainHash?: unknown;
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
                signature?: unknown;
                balance?: unknown;
                previousBalanceProof?: {
                    notaryId: number;
                    notebookNumber: number;
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
            }>;
        }, "strip", z.ZodTypeAny, {
            escrow: {
                signature: Buffer;
                balance: bigint;
                accountId: string;
                accountType: import("../types/IBalanceChange").AccountType;
                changeNumber: number;
                escrowHoldNote: {
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
                        to?: string[] | null | undefined;
                    } | {
                        action: "claimFromMainchain";
                        transferId: number;
                    } | {
                        action: "escrowHold";
                        recipient: string;
                        dataDomainHash?: Buffer | null | undefined;
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
                previousBalanceProof?: {
                    notaryId: number;
                    balance: bigint;
                    notebookNumber: number;
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
            };
            datastoreId: string;
        }, {
            escrow: {
                accountId: string;
                accountType: import("../types/IBalanceChange").AccountType;
                changeNumber: number;
                escrowHoldNote: {
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
                        to?: string[] | null | undefined;
                    } | {
                        action: "claimFromMainchain";
                        transferId: number;
                    } | {
                        action: "escrowHold";
                        recipient: string;
                        dataDomainHash?: unknown;
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
                signature?: unknown;
                balance?: unknown;
                previousBalanceProof?: {
                    notaryId: number;
                    notebookNumber: number;
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
            };
            datastoreId: string;
        }>;
        result: z.ZodObject<{
            accepted: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            accepted: boolean;
        }, {
            accepted: boolean;
        }>;
    };
};
export interface IEscrowEvents {
}
type IEscrowApiTypes = IZodSchemaToApiTypes<typeof EscrowApisSchema>;
export default IEscrowApiTypes;
