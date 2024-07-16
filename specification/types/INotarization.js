"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotarizationSchema = exports.BlockVoteSchema = exports.DataDomainSchema = void 0;
const zod_1 = require("zod");
const IBalanceChange_1 = require("./IBalanceChange");
const index_1 = require("./index");
exports.DataDomainSchema = zod_1.z.tuple([
    index_1.hashValidation.describe('The data domain hash'),
    index_1.addressValidation.describe('The account id the data domain is registered to.'),
]);
exports.BlockVoteSchema = zod_1.z.object({
    accountId: index_1.addressValidation,
    blockHash: index_1.hashValidation.describe('The block hash being voted on. Must be in last 2 ticks.'),
    index: zod_1.z.number().int().nonnegative().describe('An index to provide noise to the vote hash'),
    power: index_1.milligonsValidation.describe('The tax applied (and thus multiplier) of this vote'),
    dataDomainHash: index_1.hashValidation.describe('The data domain hash used for this vote'),
    dataDomainAccount: index_1.addressValidation.describe('The data domain payment address used to create this vote'),
});
exports.NotarizationSchema = zod_1.z.object({
    balanceChanges: IBalanceChange_1.BalanceChangeSchema.array().max(25),
    blockVotes: exports.BlockVoteSchema.array().max(100),
    dataDomains: exports.DataDomainSchema.array().max(100),
});
//# sourceMappingURL=INotarization.js.map