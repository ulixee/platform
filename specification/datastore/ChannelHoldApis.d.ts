/// <reference types="node" />
import { z } from 'zod';
import { IZodSchemaToApiTypes } from '../utils/IZodApi';
export declare const ChannelHoldApisSchema: {
    'ChannelHold.register': {
        args: z.ZodObject<{
            datastoreId: z.ZodString;
            channelHold: z.ZodObject<z.objectUtil.extendShape<{
                accountId: z.ZodString;
                accountType: z.ZodNativeEnum<typeof import("@argonprotocol/localchain").AccountType>;
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
                    notebookNumber: number;
                    notaryId: number;
                    tick: number;
                    balance: bigint;
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
                channelHoldNote: z.ZodOptional<z.ZodNullable<z.ZodObject<{
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
                        action: z.ZodLiteral<"channelHold">;
                        recipient: z.ZodString;
                        domainHash: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodType<Buffer, z.ZodTypeDef, Buffer>, Buffer, Buffer>, Buffer, unknown>>>>;
                        delegatedSigner: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
                    }, "strip", z.ZodTypeAny, {
                        action: "channelHold";
                        recipient: string;
                        domainHash?: Buffer | null | undefined;
                        delegatedSigner?: string | null | undefined;
                    }, {
                        action: "channelHold";
                        recipient: string;
                        domainHash?: unknown;
                        delegatedSigner?: string | null | undefined;
                    }>, z.ZodObject<{
                        action: z.ZodLiteral<"channelHoldSettle">;
                    }, z.UnknownKeysParam, z.ZodTypeAny, {
                        action: "channelHoldSettle";
                    }, {
                        action: "channelHoldSettle";
                    }>, z.ZodObject<{
                        action: z.ZodLiteral<"channelHoldClaim">;
                    }, z.UnknownKeysParam, z.ZodTypeAny, {
                        action: "channelHoldClaim";
                    }, {
                        action: "channelHoldClaim";
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
                        action: "channelHold";
                        recipient: string;
                        domainHash?: Buffer | null | undefined;
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
                        action: "channelHoldSettle";
                    } | {
                        action: "channelHoldClaim";
                    };
                }, {
                    noteType: {
                        action: "send";
                        to?: string[] | null | undefined;
                    } | {
                        action: "claimFromMainchain";
                        transferId: number;
                    } | {
                        action: "channelHold";
                        recipient: string;
                        domainHash?: unknown;
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
                        action: "channelHoldSettle";
                    } | {
                        action: "channelHoldClaim";
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
                        action: z.ZodLiteral<"channelHold">;
                        recipient: z.ZodString;
                        domainHash: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodType<Buffer, z.ZodTypeDef, Buffer>, Buffer, Buffer>, Buffer, unknown>>>>;
                        delegatedSigner: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
                    }, "strip", z.ZodTypeAny, {
                        action: "channelHold";
                        recipient: string;
                        domainHash?: Buffer | null | undefined;
                        delegatedSigner?: string | null | undefined;
                    }, {
                        action: "channelHold";
                        recipient: string;
                        domainHash?: unknown;
                        delegatedSigner?: string | null | undefined;
                    }>, z.ZodObject<{
                        action: z.ZodLiteral<"channelHoldSettle">;
                    }, z.UnknownKeysParam, z.ZodTypeAny, {
                        action: "channelHoldSettle";
                    }, {
                        action: "channelHoldSettle";
                    }>, z.ZodObject<{
                        action: z.ZodLiteral<"channelHoldClaim">;
                    }, z.UnknownKeysParam, z.ZodTypeAny, {
                        action: "channelHoldClaim";
                    }, {
                        action: "channelHoldClaim";
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
                        action: "channelHold";
                        recipient: string;
                        domainHash?: Buffer | null | undefined;
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
                        action: "channelHoldSettle";
                    } | {
                        action: "channelHoldClaim";
                    };
                }, {
                    noteType: {
                        action: "send";
                        to?: string[] | null | undefined;
                    } | {
                        action: "claimFromMainchain";
                        transferId: number;
                    } | {
                        action: "channelHold";
                        recipient: string;
                        domainHash?: unknown;
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
                        action: "channelHoldSettle";
                    } | {
                        action: "channelHoldClaim";
                    };
                    milligons?: unknown;
                }>, "many">;
                signature: z.ZodEffects<z.ZodEffects<z.ZodType<Buffer, z.ZodTypeDef, Buffer>, Buffer, Buffer>, Buffer, unknown>;
            }, {
                channelHoldNote: z.ZodObject<{
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
                        action: z.ZodLiteral<"channelHold">;
                        recipient: z.ZodString;
                        domainHash: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodType<Buffer, z.ZodTypeDef, Buffer>, Buffer, Buffer>, Buffer, unknown>>>>;
                        delegatedSigner: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
                    }, "strip", z.ZodTypeAny, {
                        action: "channelHold";
                        recipient: string;
                        domainHash?: Buffer | null | undefined;
                        delegatedSigner?: string | null | undefined;
                    }, {
                        action: "channelHold";
                        recipient: string;
                        domainHash?: unknown;
                        delegatedSigner?: string | null | undefined;
                    }>, z.ZodObject<{
                        action: z.ZodLiteral<"channelHoldSettle">;
                    }, z.UnknownKeysParam, z.ZodTypeAny, {
                        action: "channelHoldSettle";
                    }, {
                        action: "channelHoldSettle";
                    }>, z.ZodObject<{
                        action: z.ZodLiteral<"channelHoldClaim">;
                    }, z.UnknownKeysParam, z.ZodTypeAny, {
                        action: "channelHoldClaim";
                    }, {
                        action: "channelHoldClaim";
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
                        action: "channelHold";
                        recipient: string;
                        domainHash?: Buffer | null | undefined;
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
                        action: "channelHoldSettle";
                    } | {
                        action: "channelHoldClaim";
                    };
                }, {
                    noteType: {
                        action: "send";
                        to?: string[] | null | undefined;
                    } | {
                        action: "claimFromMainchain";
                        transferId: number;
                    } | {
                        action: "channelHold";
                        recipient: string;
                        domainHash?: unknown;
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
                        action: "channelHoldSettle";
                    } | {
                        action: "channelHoldClaim";
                    };
                    milligons?: unknown;
                }>;
            }>, "strip", z.ZodTypeAny, {
                balance: bigint;
                accountId: string;
                accountType: import("@argonprotocol/localchain").AccountType;
                changeNumber: number;
                channelHoldNote: {
                    milligons: bigint;
                    noteType: {
                        action: "send";
                        to?: string[] | null | undefined;
                    } | {
                        action: "claimFromMainchain";
                        transferId: number;
                    } | {
                        action: "channelHold";
                        recipient: string;
                        domainHash?: Buffer | null | undefined;
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
                        action: "channelHoldSettle";
                    } | {
                        action: "channelHoldClaim";
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
                        action: "channelHold";
                        recipient: string;
                        domainHash?: Buffer | null | undefined;
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
                        action: "channelHoldSettle";
                    } | {
                        action: "channelHoldClaim";
                    };
                }[];
                signature: Buffer;
                previousBalanceProof?: {
                    notebookNumber: number;
                    notaryId: number;
                    tick: number;
                    balance: bigint;
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
                accountType: import("@argonprotocol/localchain").AccountType;
                changeNumber: number;
                channelHoldNote: {
                    noteType: {
                        action: "send";
                        to?: string[] | null | undefined;
                    } | {
                        action: "claimFromMainchain";
                        transferId: number;
                    } | {
                        action: "channelHold";
                        recipient: string;
                        domainHash?: unknown;
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
                        action: "channelHoldSettle";
                    } | {
                        action: "channelHoldClaim";
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
                        action: "channelHold";
                        recipient: string;
                        domainHash?: unknown;
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
                        action: "channelHoldSettle";
                    } | {
                        action: "channelHoldClaim";
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
            channelHold: {
                balance: bigint;
                accountId: string;
                accountType: import("@argonprotocol/localchain").AccountType;
                changeNumber: number;
                channelHoldNote: {
                    milligons: bigint;
                    noteType: {
                        action: "send";
                        to?: string[] | null | undefined;
                    } | {
                        action: "claimFromMainchain";
                        transferId: number;
                    } | {
                        action: "channelHold";
                        recipient: string;
                        domainHash?: Buffer | null | undefined;
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
                        action: "channelHoldSettle";
                    } | {
                        action: "channelHoldClaim";
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
                        action: "channelHold";
                        recipient: string;
                        domainHash?: Buffer | null | undefined;
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
                        action: "channelHoldSettle";
                    } | {
                        action: "channelHoldClaim";
                    };
                }[];
                signature: Buffer;
                previousBalanceProof?: {
                    notebookNumber: number;
                    notaryId: number;
                    tick: number;
                    balance: bigint;
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
            channelHold: {
                accountId: string;
                accountType: import("@argonprotocol/localchain").AccountType;
                changeNumber: number;
                channelHoldNote: {
                    noteType: {
                        action: "send";
                        to?: string[] | null | undefined;
                    } | {
                        action: "claimFromMainchain";
                        transferId: number;
                    } | {
                        action: "channelHold";
                        recipient: string;
                        domainHash?: unknown;
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
                        action: "channelHoldSettle";
                    } | {
                        action: "channelHoldClaim";
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
                        action: "channelHold";
                        recipient: string;
                        domainHash?: unknown;
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
                        action: "channelHoldSettle";
                    } | {
                        action: "channelHoldClaim";
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
};
export interface IChannelHoldEvents {
}
type IChannelHoldApiTypes = IZodSchemaToApiTypes<typeof ChannelHoldApisSchema>;
export default IChannelHoldApiTypes;