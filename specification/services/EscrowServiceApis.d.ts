/// <reference types="node" />
import { z } from 'zod';
import { IZodHandlers, IZodSchemaToApiTypes } from '../utils/IZodApi';
export declare const EscrowServiceApiSchemas: {
    'EscrowService.importEscrow': {
        args: z.ZodObject<{
            datastoreId: z.ZodString;
            escrow: z.ZodObject<{
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
                }>;
            }, "strip", z.ZodTypeAny, {
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
                signature?: unknown;
            }>;
        }, "strip", z.ZodTypeAny, {
            escrow: {
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
                signature?: unknown;
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
    'EscrowService.debitPayment': {
        args: z.ZodObject<{
            datastoreId: z.ZodString;
            queryId: z.ZodString;
            payment: z.ZodObject<{
                escrow: z.ZodOptional<z.ZodObject<{
                    id: z.ZodString;
                    settledMilligons: z.ZodEffects<z.ZodBigInt, bigint, unknown>;
                    settledSignature: z.ZodEffects<z.ZodEffects<z.ZodType<Buffer, z.ZodTypeDef, Buffer>, Buffer, Buffer>, Buffer, unknown>;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    settledMilligons: bigint;
                    settledSignature: Buffer;
                }, {
                    id: string;
                    settledMilligons?: unknown;
                    settledSignature?: unknown;
                }>>;
                credits: z.ZodOptional<z.ZodObject<{
                    id: z.ZodString;
                    secret: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    secret: string;
                }, {
                    id: string;
                    secret: string;
                }>>;
                uuid: z.ZodString;
                microgons: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                uuid: string;
                microgons: number;
                escrow?: {
                    id: string;
                    settledMilligons: bigint;
                    settledSignature: Buffer;
                } | undefined;
                credits?: {
                    id: string;
                    secret: string;
                } | undefined;
            }, {
                uuid: string;
                microgons: number;
                escrow?: {
                    id: string;
                    settledMilligons?: unknown;
                    settledSignature?: unknown;
                } | undefined;
                credits?: {
                    id: string;
                    secret: string;
                } | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            datastoreId: string;
            payment: {
                uuid: string;
                microgons: number;
                escrow?: {
                    id: string;
                    settledMilligons: bigint;
                    settledSignature: Buffer;
                } | undefined;
                credits?: {
                    id: string;
                    secret: string;
                } | undefined;
            };
            queryId: string;
        }, {
            datastoreId: string;
            payment: {
                uuid: string;
                microgons: number;
                escrow?: {
                    id: string;
                    settledMilligons?: unknown;
                    settledSignature?: unknown;
                } | undefined;
                credits?: {
                    id: string;
                    secret: string;
                } | undefined;
            };
            queryId: string;
        }>;
        result: z.ZodObject<{
            shouldFinalize: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            shouldFinalize: boolean;
        }, {
            shouldFinalize: boolean;
        }>;
    };
    'EscrowService.finalizePayment': {
        args: z.ZodObject<{
            datastoreId: z.ZodString;
            escrowId: z.ZodString;
            uuid: z.ZodString;
            finalMicrogons: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            uuid: string;
            datastoreId: string;
            escrowId: string;
            finalMicrogons: number;
        }, {
            uuid: string;
            datastoreId: string;
            escrowId: string;
            finalMicrogons: number;
        }>;
        result: z.ZodVoid;
    };
};
export type IEscrowServiceApiTypes = IZodSchemaToApiTypes<typeof EscrowServiceApiSchemas>;
export type IEscrowServiceApis<TContext = any> = IZodHandlers<typeof EscrowServiceApiSchemas, TContext>;
export default IEscrowServiceApiTypes;
