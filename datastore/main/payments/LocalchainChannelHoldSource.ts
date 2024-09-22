import { LocalchainOverview, OpenChannelHold } from '@argonprotocol/localchain';
import IPaymentServiceApiTypes from '@ulixee/platform-specification/datastore/PaymentServiceApis';
import IBalanceChange, {
  BalanceChangeSchema,
} from '@ulixee/platform-specification/types/IBalanceChange';
import { IChannelHoldDetails, IChannelHoldSource } from './ArgonReserver';
import LocalchainWithSync from './LocalchainWithSync';

export default class LocalchainChannelHoldSource implements IChannelHoldSource {
  public get sourceKey(): string {
    return `localchain-${this.address}`;
  }

  private readonly openChannelHoldsById: { [channelHoldId: string]: OpenChannelHold } = {};

  constructor(
    public localchain: LocalchainWithSync,
    public address: string,
  ) {}

  public async getAccountOverview(): Promise<LocalchainOverview> {
    return await this.localchain.getAccountOverview();
  }

  public async createChannelHold(
    paymentInfo: IPaymentServiceApiTypes['PaymentService.reserve']['args'],
    milligons: bigint,
  ): Promise<IChannelHoldDetails> {
    const { domain } = paymentInfo;
    const openChannelHold = await this.localchain.inner.transactions.createChannelHold(
      milligons,
      paymentInfo.recipient.address!,
      domain,
      paymentInfo.recipient.notaryId,
    );

    const balanceChange = await BalanceChangeSchema.parseAsync(
      JSON.parse(await openChannelHold.exportForSend()),
    );

    const channelHold = await openChannelHold.channelHold;
    const channelHoldId = channelHold.id;
    const expirationMillis = this.localchain.timeForTick(channelHold.expirationTick);

    this.openChannelHoldsById[channelHoldId] = openChannelHold;
    return {
      channelHoldId,
      balanceChange,
      expirationDate: new Date(Number(expirationMillis)),
    };
  }

  public async updateChannelHoldSettlement(
    channelHold: IChannelHoldDetails,
    updatedSettlement: bigint,
  ): Promise<IBalanceChange> {
    const channelHoldId = channelHold.channelHoldId;
    this.openChannelHoldsById[channelHoldId] ??= await this.localchain.openChannelHolds.get(channelHoldId);
    const openChannelHold = this.openChannelHoldsById[channelHoldId];
    const result = await openChannelHold.sign(updatedSettlement);
    const balanceChange = channelHold.balanceChange;
    balanceChange.signature = Buffer.from(result.signature);
    balanceChange.notes[0].milligons = result.milligons;
    balanceChange.balance = balanceChange.channelHoldNote!.milligons - result.milligons;
    return balanceChange;
  }
}
