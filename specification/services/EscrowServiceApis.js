"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EscrowServiceApiSchemas = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
const datastoreIdValidation_1 = require("../types/datastoreIdValidation");
const IBalanceChange_1 = require("../types/IBalanceChange");
const INote_1 = require("../types/INote");
const IPayment_1 = require("../types/IPayment");
exports.EscrowServiceApiSchemas = {
    'EscrowService.importEscrow': {
        args: zod_1.z.object({
            datastoreId: datastoreIdValidation_1.datastoreIdValidation,
            escrow: IBalanceChange_1.BalanceChangeSchema.describe('An escrow balance change putting funds on hold for this datastore.').extend({
                escrowHoldNote: INote_1.NoteSchema.describe('The active escrow hold note'),
            }),
        }),
        result: zod_1.z.object({
            accepted: zod_1.z.boolean(),
        }),
    },
    'EscrowService.debitPayment': {
        args: zod_1.z.object({
            datastoreId: datastoreIdValidation_1.datastoreIdValidation,
            queryId: zod_1.z.string(),
            payment: IPayment_1.PaymentSchema,
        }),
        result: zod_1.z.object({
            shouldFinalize: zod_1.z.boolean(),
        }),
    },
    'EscrowService.finalizePayment': {
        args: zod_1.z.object({
            datastoreId: datastoreIdValidation_1.datastoreIdValidation,
            escrowId: IPayment_1.escrowIdValidation,
            uuid: zod_1.z.string().length(21),
            finalMicrogons: types_1.microgonsValidation,
        }),
        result: zod_1.z.void(),
    },
};
//# sourceMappingURL=EscrowServiceApis.js.map