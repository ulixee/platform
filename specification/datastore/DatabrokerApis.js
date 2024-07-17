"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabrokerApisSchema = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
const IBalanceChange_1 = require("../types/IBalanceChange");
const IDatastoreManifest_1 = require("../types/IDatastoreManifest");
const IPayment_1 = require("../types/IPayment");
exports.DatabrokerApisSchema = {
    'Databroker.createEscrow': {
        args: zod_1.z.object({
            recipient: IDatastoreManifest_1.DatastorePaymentRecipientSchema,
            milligons: types_1.milligonsValidation.describe('Amount to reserve'),
            domain: zod_1.z.string().optional().describe('The datastore domain if applicable'),
            datastoreId: zod_1.z.string().describe('The datastore id'),
            delegatedSigningAddress: types_1.addressValidation.describe('A delegated signing address in SS58 format'),
            authentication: zod_1.z.object({
                identity: types_1.identityValidation.describe('The user identity making this request'),
                signature: types_1.identitySignatureValidation.describe('The user signature'),
                nonce: zod_1.z.string().length(10).describe('A nonce for this request'),
            }),
        }),
        result: zod_1.z.object({
            escrowId: IPayment_1.escrowIdValidation,
            balanceChange: IBalanceChange_1.BalanceChangeSchema,
            expirationDate: zod_1.z.date().describe('The date this escrow expires'),
        }),
    },
    'Databroker.getBalance': {
        args: zod_1.z.object({
            identity: types_1.identityValidation.describe('The user identity making this request'),
        }),
        result: zod_1.z.object({
            balance: types_1.milligonsValidation.describe('The balance in milligons'),
        }),
    },
};
//# sourceMappingURL=DatabrokerApis.js.map