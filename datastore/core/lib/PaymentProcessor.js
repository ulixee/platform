"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const verifyMicronote_1 = require("@ulixee/sidechain/lib/verifyMicronote");
const errors_1 = require("@ulixee/sidechain/lib/errors");
const CreditsTable_1 = require("@ulixee/datastore/lib/CreditsTable");
const TypeSerializer_1 = require("@ulixee/commons/lib/TypeSerializer");
const errors_2 = require("./errors");
/**
 * 50 microgons for 1KB means:
 * 1 microgons per 20.5 bytes
 * 1MB is $0.05
 * 1GB is $52.43
 *
 * Luminati is 1.2c per mb base price (but that's for all page contents)
 *  ie, 12k microgons, ie, 12 microgons per kb
 *
 */
class PaymentProcessor {
    constructor(payment, datastore, context) {
        this.payment = payment;
        this.datastore = datastore;
        this.context = context;
        this.microgonsToHold = 0;
        this.functionHolds = [];
        this.payouts = [];
    }
    async createHold(manifest, functionCallsWithTempIds, pricingPreferences = { maxComputePricePerQuery: 0 }) {
        const configuration = this.context.configuration;
        const computePricePerQuery = configuration.computePricePerQuery ?? 0;
        if (computePricePerQuery > 0) {
            const maxComputePricePerQuery = pricingPreferences.maxComputePricePerQuery;
            if (maxComputePricePerQuery &&
                maxComputePricePerQuery > 0 &&
                maxComputePricePerQuery < computePricePerQuery) {
                throw new errors_2.MaxSurgePricePerQueryExceeededError(maxComputePricePerQuery, computePricePerQuery);
            }
            this.payouts.push({
                address: configuration.paymentAddress,
                microgons: computePricePerQuery,
            });
            this.microgonsToHold += computePricePerQuery;
        }
        let minimumPrice = computePricePerQuery;
        for (const functionCall of functionCallsWithTempIds) {
            const prices = (manifest.extractorsByName[functionCall.name] ?? manifest.crawlersByName[functionCall.name])
                ?.prices ?? [];
            const pricePerQuery = prices[0]?.perQuery ?? 0;
            const pricePerKb = prices[0]?.addOns?.perKb ?? 0;
            const holdMicrogons = prices[0]?.minimum ?? pricePerQuery ?? 0;
            this.microgonsToHold += holdMicrogons;
            const payouts = [];
            if (pricePerQuery > 0 || pricePerKb > 0) {
                payouts.push({ address: manifest.paymentAddress, pricePerKb, pricePerQuery });
            }
            if (payouts.length) {
                this.functionHolds.push({
                    id: functionCall.id,
                    didRelease: false,
                    payouts,
                    heldMicrogons: holdMicrogons,
                });
            }
            for (const price of prices)
                minimumPrice += price.minimum ?? 0;
        }
        if (minimumPrice > 0 && !this.payment?.credits && !this.payment?.micronote) {
            throw new errors_2.MicronotePaymentRequiredError('This Datastore requires payment.', minimumPrice);
        }
        if (!this.payment?.credits && !this.payment?.micronote)
            return true;
        if (this.microgonsToHold === 0)
            return true;
        if (this.payment.credits) {
            const credits = this.datastore.tables[CreditsTable_1.default.tableName];
            if (!credits)
                throw new Error('This Datastore does not support Credits.');
            const { id, secret } = this.payment.credits;
            const remainingBalance = await credits.hold(id, secret, this.microgonsToHold);
            this.fundingBalance = remainingBalance + this.microgonsToHold;
            this.holdId = id;
        }
        else {
            await this.loadSidechain();
            await this.canUseMicronote();
            await this.holdMicronoteMinimum();
        }
        return true;
    }
    releaseLocalFunctionHold(functionId, resultBytes) {
        if (!this.holdId || functionId < 0)
            return 0;
        let totalMicrogons = 0;
        const extractorCall = this.functionHolds.find(x => x.id === functionId);
        if (extractorCall.didRelease)
            throw new Error(`This function call was already released! (id=${functionId})`);
        for (const payout of extractorCall.payouts) {
            let microgons = payout.pricePerQuery ?? 0;
            if (payout.pricePerKb) {
                microgons += Math.floor((resultBytes / 1000) * payout.pricePerKb);
            }
            if (microgons === 0)
                continue;
            totalMicrogons += microgons;
            this.payouts.push({ microgons, address: payout.address });
        }
        extractorCall.didRelease = true;
        return totalMicrogons;
    }
    async settle(finalResultBytes) {
        if (!this.holdId)
            return 0;
        if (this.functionHolds.length === 1 && !this.functionHolds[0].didRelease) {
            this.releaseLocalFunctionHold(this.functionHolds[0].id, finalResultBytes);
        }
        const payments = {};
        // NOTE: don't claim the settlement cost!!
        const maxMicrogons = this.fundingBalance - (this.sidechainSettings?.settlementFeeMicrogons ?? 0);
        let allocatedMicrogons = 0;
        let totalMicrogons = 0;
        for (const payout of this.payouts) {
            let microgons = payout.microgons;
            totalMicrogons += microgons;
            if (allocatedMicrogons + microgons > maxMicrogons) {
                microgons = maxMicrogons - allocatedMicrogons;
                allocatedMicrogons = maxMicrogons;
            }
            else {
                allocatedMicrogons += microgons;
            }
            payments[payout.address] ??= 0;
            payments[payout.address] += microgons;
        }
        if (this.payment?.credits && this.holdId) {
            const total = Object.values(payments).reduce((a, b) => a + b, 0);
            const { id } = this.payment.credits;
            await this.datastore.tables[CreditsTable_1.default.tableName].finalize(id, this.microgonsToHold, total);
            return total;
        }
        const isFinal = !!this.holdAuthorizationCode;
        const result = await this.sidechain.settleMicronote(this.payment.micronote.micronoteId, this.payment.micronote.batchSlug, this.holdId, payments, isFinal);
        // if nsf, claim the funds that are allocated, but do not return the query result
        if (totalMicrogons > maxMicrogons) {
            throw new errors_2.InsufficientMicronoteFundsError(this.payment.micronote.microgons, totalMicrogons);
        }
        return result?.finalCost ?? totalMicrogons;
    }
    async canUseMicronote() {
        const microgonsAllocated = this.payment.micronote.microgons - this.sidechainSettings.settlementFeeMicrogons;
        if (microgonsAllocated < this.microgonsToHold) {
            throw new errors_2.InsufficientQueryPriceError(microgonsAllocated, this.microgonsToHold);
        }
        (0, verifyMicronote_1.default)(this.payment.micronote, await this.context.sidechainClientManager.getApprovedSidechainRootIdentities(), this.sidechainSettings.blockHeight);
        return true;
    }
    async holdMicronoteMinimum() {
        const { micronoteId, batchSlug, holdAuthorizationCode } = this.payment.micronote;
        const hold = await this.sidechain.holdMicronoteFunds(micronoteId, batchSlug, this.microgonsToHold, holdAuthorizationCode);
        if (hold.holdAuthorizationCode) {
            this.holdAuthorizationCode = hold.holdAuthorizationCode;
            // Add to the payments. This will active it for follow-on extractors
            this.payment.micronote.holdAuthorizationCode = hold.holdAuthorizationCode;
        }
        if (hold.accepted) {
            this.holdId = hold.holdId;
            this.fundingBalance = hold.remainingBalance + this.microgonsToHold;
        }
        else {
            throw new errors_2.InsufficientMicronoteFundsError(hold.remainingBalance, this.microgonsToHold);
        }
        return true;
    }
    async loadSidechain() {
        const sidechainIdentity = this.payment?.micronote?.sidechainIdentity;
        const approvedSidechains = await this.context.sidechainClientManager.getApprovedSidechainRootIdentities();
        if (!approvedSidechains.has(sidechainIdentity)) {
            throw new errors_1.UnapprovedSidechainError();
        }
        this.sidechain = await this.context.sidechainClientManager.withIdentity(sidechainIdentity);
        const settings = await this.sidechain.getSettings(true);
        this.sidechainSettings = {
            settlementFeeMicrogons: settings.settlementFeeMicrogons,
            blockHeight: settings.latestBlockSettings?.height ?? 0,
        };
    }
    static async getPrice(prices, context) {
        let pricePerQuery = 0;
        for (const price of prices) {
            if (Number.isInteger(price.perQuery))
                pricePerQuery += price.perQuery;
        }
        let settlementFee = 0;
        if (pricePerQuery > 0) {
            if (this.settlementFeeMicrogons === undefined) {
                const settings = await context.sidechainClientManager.defaultClient
                    ?.getSettings(false, false)
                    .catch(() => null);
                this.settlementFeeMicrogons = settings?.settlementFeeMicrogons ?? 0;
            }
            settlementFee = this.settlementFeeMicrogons;
        }
        return { settlementFee, pricePerQuery };
    }
    static getOfficialBytes(output) {
        // must use types or you can't serialize Bigint/Regex/etc
        return Buffer.byteLength(Buffer.from(TypeSerializer_1.default.stringify(output), 'utf8'));
    }
}
exports.default = PaymentProcessor;
//# sourceMappingURL=PaymentProcessor.js.map