"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EscrowApisSchema = void 0;
const zod_1 = require("zod");
const datastoreIdValidation_1 = require("../types/datastoreIdValidation");
const IBalanceChange_1 = require("../types/IBalanceChange");
const INote_1 = require("../types/INote");
exports.EscrowApisSchema = {
    'Escrow.register': {
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
};
//# sourceMappingURL=EscrowApis.js.map