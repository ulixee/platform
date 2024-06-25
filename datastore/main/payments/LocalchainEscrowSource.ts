import { LocalchainOverview, OpenEscrow } from '@ulixee/localchain';
import IPaymentServiceApiTypes from '@ulixee/platform-specification/datastore/PaymentServiceApis';
import IBalanceChange, {
  BalanceChangeSchema,
} from '@ulixee/platform-specification/types/IBalanceChange';
import { IEscrowDetails, IEscrowSource } from './ArgonReserver';
import LocalchainWithSync from './LocalchainWithSync';

export default class LocalchainEscrowSource implements IEscrowSource {
  public get sourceKey(): string {
    return `localchain-${this.address}`;
  }

  private readonly openEscrowsById: { [escrowId: string]: OpenEscrow } = {};

  constructor(
    public localchain: LocalchainWithSync,
    public address: string,
  ) {}

  public async getAccountOverview(): Promise<LocalchainOverview> {
    return await this.localchain.getAccountOverview();
  }

  public async createEscrow(
    paymentInfo: IPaymentServiceApiTypes['PaymentService.reserve']['args'],
    milligons: bigint,
  ): Promise<IEscrowDetails> {
    const { domain } = paymentInfo;
    const openEscrow = await this.localchain.inner.transactions.createEscrow(
      milligons,
      paymentInfo.recipient.address!,
      domain,
      paymentInfo.recipient.notaryId,
    );

    const balanceChange = await BalanceChangeSchema.parseAsync(
      JSON.parse(await openEscrow.exportForSend()),
    );

    const escrow = await openEscrow.escrow;
    const escrowId = escrow.id;
    const expirationMillis = this.localchain.timeForTick(escrow.expirationTick);

    this.openEscrowsById[escrowId] = openEscrow;
    return {
      escrowId,
      balanceChange,
      expirationDate: new Date(Number(expirationMillis)),
    };
  }

  public async updateEscrowSettlement(
    escrow: IEscrowDetails,
    updatedSettlement: bigint,
  ): Promise<IBalanceChange> {
    const escrowId = escrow.escrowId;
    this.openEscrowsById[escrowId] ??= await this.localchain.openEscrows.get(escrowId);
    const openEscrow = this.openEscrowsById[escrowId];
    const result = await openEscrow.sign(updatedSettlement);
    const balanceChange = escrow.balanceChange;
    balanceChange.signature = Buffer.from(result.signature);
    balanceChange.notes[0].milligons = result.milligons;
    balanceChange.balance = balanceChange.escrowHoldNote!.milligons - result.milligons;
    return balanceChange;
  }
}
