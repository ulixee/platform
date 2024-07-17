/// <reference types="node" />
import { z } from 'zod';
export declare const SendNote: z.ZodObject<{
    action: z.ZodLiteral<"send">;
    to: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>>;
}, "strip", z.ZodTypeAny, {
    action: "send";
    to?: string[] | null | undefined;
}, {
    action: "send";
    to?: string[] | null | undefined;
}>;
export declare const ClaimFromMainchainNote: z.ZodObject<{
    action: z.ZodLiteral<"claimFromMainchain">;
    transferId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    action: "claimFromMainchain";
    transferId: number;
}, {
    action: "claimFromMainchain";
    transferId: number;
}>;
export declare const EscrowHoldNote: z.ZodObject<{
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
}>;
export declare const LeaseDomain: z.ZodObject<{
    action: z.ZodLiteral<"LeaseDomain">;
}, z.UnknownKeysParam, z.ZodTypeAny, {
    action: "LeaseDomain";
}, {
    action: "LeaseDomain";
}>;
export declare const NoteSchema: z.ZodObject<{
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
type INote = z.infer<typeof NoteSchema>;
export default INote;
