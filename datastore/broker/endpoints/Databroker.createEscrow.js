"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@ulixee/commons/lib/utils");
const BrokerEscrowSource_1 = require("@ulixee/datastore/payments/BrokerEscrowSource");
const IBalanceChange_1 = require("@ulixee/platform-specification/types/IBalanceChange");
const Identity_1 = require("@ulixee/platform-utils/lib/Identity");
const DatabrokerApiHandler_1 = require("../lib/DatabrokerApiHandler");
exports.default = new DatabrokerApiHandler_1.default('Databroker.createEscrow', {
    async handler(request, context) {
        const { milligons, recipient, datastoreId, domain, delegatedSigningAddress, authentication } = request;
        const { identity, signature, nonce } = authentication;
        const identityBytes = Identity_1.default.getBytes(identity);
        (0, utils_1.assert)(context.datastoreWhitelist.isWhitelisted(datastoreId, domain), "Sorry, this datastore domain isn't whitelisted.");
        const signatureMessage = BrokerEscrowSource_1.default.createSignatureMessage(domain, datastoreId, identityBytes, milligons, nonce);
        (0, utils_1.assert)(Identity_1.default.verify(identity, signatureMessage, signature), 'Invalid signature');
        const db = context.db;
        return await db.transaction(async () => {
            const organizationId = db.users.getOrganizationId(identity);
            (0, utils_1.assert)(organizationId, 'Organization not found');
            db.organizations.debit(organizationId, milligons);
            const openEscrow = await context.localchain.transactions.createEscrow(milligons, recipient.address, domain, recipient.notaryId, delegatedSigningAddress);
            const escrow = await openEscrow.escrow;
            db.escrows.create({
                escrowId: escrow.id,
                heldMilligons: milligons,
                dataDomain: domain,
                organizationId,
                settledMilligons: escrow.settledAmount,
                settlementDate: null,
                createdByIdentity: identity,
                created: Date.now(),
            });
            const balanceChange = await IBalanceChange_1.BalanceChangeSchema.parseAsync(JSON.parse(await openEscrow.exportForSend()));
            const expirationDate = context.localchain.timeForTick(escrow.expirationTick);
            return {
                escrowId: escrow.id,
                balanceChange,
                expirationDate,
            };
        });
    },
});
//# sourceMappingURL=Databroker.createEscrow.js.map