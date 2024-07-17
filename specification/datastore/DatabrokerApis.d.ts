/// <reference types="node" />
import { z } from 'zod';
import { IZodSchemaToApiTypes } from '../utils/IZodApi';
export declare const DatabrokerApisSchema: {
    'Databroker.createEscrow': {
        args: z.ZodObject<{
            recipient: z.ZodObject<{
                address: z.ZodOptional<z.ZodString>;
                notaryId: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                notaryId: number;
                address?: string | undefined;
            }, {
                notaryId: number;
                address?: string | undefined;
            }>;
            milligons: z.ZodEffects<z.ZodBigInt, bigint, unknown>;
            domain: z.ZodOptional<z.ZodString>;
            datastoreId: z.ZodString;
            delegatedSigningAddress: z.ZodString;
            authentication: z.ZodObject<{
                identity: z.ZodString;
                signature: z.ZodEffects<z.ZodType<Buffer, z.ZodTypeDef, Buffer>, Buffer, Buffer>;
                nonce: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                identity: string;
                signature: Buffer;
                nonce: string;
            }, {
                identity: string;
                signature: Buffer;
                nonce: string;
            }>;
        }, "strip", z.ZodTypeAny, {
            recipient: {
                notaryId: number;
                address?: string | undefined;
            };
            milligons: bigint;
            datastoreId: string;
            delegatedSigningAddress: string;
            authentication: {
                identity: string;
                signature: Buffer;
                nonce: string;
            };
            domain?: string | undefined;
        }, {
            recipient: {
                notaryId: number;
                address?: string | undefined;
            };
            datastoreId: string;
            delegatedSigningAddress: string;
            authentication: {
                identity: string;
                signature: Buffer;
                nonce: string;
            };
            milligons?: unknown;
            domain?: string | undefined;
        }>;
        result: z.ZodObject<{
            escrowId: z.ZodString;
            balanceChange: z.ZodObject<{
                accountId: z.ZodString;
                accountType: z.ZodNativeEnum<typeof import("../types/IBalanceChange").AccountType>;
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
                accountType: import("../types/IBalanceChange").AccountType;
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
                accountType: import("../types/IBalanceChange").AccountType;
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
            }>;
            expirationDate: z.ZodDate;
        }, "strip", z.ZodTypeAny, {
            escrowId: string;
            balanceChange: {
                balance: bigint;
                accountId: string;
                accountType: import("../types/IBalanceChange").AccountType;
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
            };
            expirationDate: Date;
        }, {
            escrowId: string;
            balanceChange: {
                accountId: string;
                accountType: import("../types/IBalanceChange").AccountType;
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
            };
            expirationDate: Date;
        }>;
    };
    'Databroker.getBalance': {
        args: z.ZodObject<{
            identity: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            identity: string;
        }, {
            identity: string;
        }>;
        result: z.ZodObject<{
            balance: z.ZodEffects<z.ZodBigInt, bigint, unknown>;
        }, "strip", z.ZodTypeAny, {
            balance: bigint;
        }, {
            balance?: unknown;
        }>;
    };
};
type IDatabrokerApiTypes = IZodSchemaToApiTypes<typeof DatabrokerApisSchema>;
export { IDatabrokerApiTypes };
export default IDatabrokerApiTypes;
