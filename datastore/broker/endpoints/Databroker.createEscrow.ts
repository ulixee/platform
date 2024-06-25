import { assert } from '@ulixee/commons/lib/utils';
import BrokerEscrowSource from '@ulixee/datastore/payments/BrokerEscrowSource';
import { BalanceChangeSchema } from '@ulixee/platform-specification/types/IBalanceChange';
import Identity from '@ulixee/platform-utils/lib/Identity';
import DatabrokerApiHandler from '../lib/DatabrokerApiHandler';

export default new DatabrokerApiHandler('Databroker.createEscrow', {
  async handler(request, context) {
    const { milligons, recipient, datastoreId, domain, delegatedSigningAddress, authentication } =
      request;
    const { identity, signature, nonce } = authentication;
    const identityBytes = Identity.getBytes(identity);

    assert(
      context.datastoreWhitelist.isWhitelisted(datastoreId, domain),
      "Sorry, this datastore domain isn't whitelisted.",
    );

    const signatureMessage = BrokerEscrowSource.createSignatureMessage(
      domain,
      datastoreId,
      identityBytes,
      milligons,
      nonce,
    );
    assert(Identity.verify(identity, signatureMessage, signature), 'Invalid signature');

    const db = context.db;
    return await db.transaction(async () => {
      const organizationId = db.users.getOrganizationId(identity);
      assert(organizationId, 'Organization not found');
      db.organizations.debit(organizationId, milligons);

      const openEscrow = await context.localchain.transactions.createEscrow(
        milligons,
        recipient.address,
        domain,
        recipient.notaryId,
        delegatedSigningAddress,
      );
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
      const balanceChange = await BalanceChangeSchema.parseAsync(
        JSON.parse(await openEscrow.exportForSend()),
      );

      const expirationDate = context.localchain.timeForTick(escrow.expirationTick);

      return {
        escrowId: escrow.id,
        balanceChange,
        expirationDate,
      };
    });
  },
});
