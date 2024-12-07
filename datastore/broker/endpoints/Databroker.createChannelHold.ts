import { assert } from '@ulixee/commons/lib/utils';
import BrokerChannelHoldSource from '@ulixee/datastore/payments/BrokerChannelHoldSource';
import { BalanceChangeSchema } from '@ulixee/platform-specification/types/IBalanceChange';
import Identity from '@ulixee/platform-utils/lib/Identity';
import DatabrokerApiHandler from '../lib/DatabrokerApiHandler';

export default new DatabrokerApiHandler('Databroker.createChannelHold', {
  async handler(request, context) {
    const { microgons, recipient, datastoreId, domain, delegatedSigningAddress, authentication } =
      request;
    const { identity, signature, nonce } = authentication;
    const identityBytes = Identity.getBytes(identity);

    assert(
      context.datastoreWhitelist.isWhitelisted(datastoreId, domain),
      "Sorry, this datastore domain isn't whitelisted.",
    );

    const signatureMessage = BrokerChannelHoldSource.createSignatureMessage(
      domain,
      datastoreId,
      identityBytes,
      microgons,
      nonce,
    );
    assert(Identity.verify(identity, signatureMessage, signature), 'Invalid signature');

    const db = context.db;
    return await db.transaction(async () => {
      const organizationId = db.users.getOrganizationId(identity);
      assert(organizationId, 'Organization not found');
      db.organizations.debit(organizationId, microgons);

      const openChannelHold = await context.localchain.transactions.createChannelHold(
        microgons,
        recipient.address,
        domain,
        recipient.notaryId,
        delegatedSigningAddress,
      );
      const channelHold = await openChannelHold.channelHold;
      db.channelHolds.create({
        channelHoldId: channelHold.id,
        heldMicrogons: microgons,
        domain,
        organizationId,
        settledMicrogons: channelHold.settledAmount,
        settlementDate: null,
        createdByIdentity: identity,
        created: Date.now(),
      });
      const balanceChange = await BalanceChangeSchema.parseAsync(
        JSON.parse(await openChannelHold.exportForSend()),
      );

      const expirationDate = context.localchain.timeForTick(channelHold.expirationTick);

      return {
        channelHoldId: channelHold.id,
        balanceChange,
        expirationDate,
      };
    });
  },
});
