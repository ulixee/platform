import { IPayment } from '@ulixee/specification';
import SidechainClient from '@ulixee/sidechain';
import verifyMicronote from '@ulixee/sidechain/lib/verifyMicronote';
import { UnapprovedSidechainError } from '@ulixee/sidechain/lib/errors';
import {
  InsufficientMicronoteFundsError,
  InsufficientQueryPriceError,
  InvalidMicronoteError,
  MaxSurgePricePerQueryExceeededError,
  MicronotePaymentRequiredError,
} from './errors';
import IDataboxApiContext from '../interfaces/IDataboxApiContext';
import { IDataboxRecord } from './DataboxesTable';

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
export default class PaymentProcessor {
  static giftCardIssuersById: { [giftCardId: string]: string[] } = {};

  private microgonsToHold = 0;
  private holdId: string;
  private holdAuthorizationCode?: string;
  private fundingBalance: number;
  private sidechain: SidechainClient;
  private sidechainSettings: { settlementFeeMicrogons: number; blockHeight: number };
  private readonly functionHolds: {
    id: number;
    heldMicrogons: number;
    didRelease: boolean;
    payouts: {
      address: string;
      pricePerKb?: number;
      pricePerQuery?: number;
    }[];
  }[] = [];

  private readonly payouts: { address: string; microgons: number }[] = [];

  constructor(
    private payment: IPayment,
    readonly context: Pick<IDataboxApiContext, 'configuration' | 'sidechainClientManager'>,
  ) {}

  public async createHold(
    databox: IDataboxRecord,
    functionCalls: { id: number; functionName: string }[],
    pricingPreferences: { maxComputePricePerQuery?: number } = { maxComputePricePerQuery: 0 },
  ): Promise<boolean> {
    const configuration = this.context.configuration;
    const computePricePerQuery = configuration.computePricePerQuery ?? 0;

    if (computePricePerQuery > 0) {
      const maxComputePricePerQuery = pricingPreferences.maxComputePricePerQuery;
      if (
        maxComputePricePerQuery &&
        maxComputePricePerQuery > 0 &&
        maxComputePricePerQuery < computePricePerQuery
      ) {
        throw new MaxSurgePricePerQueryExceeededError(
          maxComputePricePerQuery,
          computePricePerQuery,
        );
      }

      this.payouts.push({
        address: configuration.paymentAddress,
        microgons: computePricePerQuery,
      });
      this.microgonsToHold += computePricePerQuery;
    }

    let minimumPrice = computePricePerQuery;
    for (const functionCall of functionCalls) {
      // no one to pay!
      if (!databox.giftCardIssuerIdentity && !databox.paymentAddress) continue;
      const prices = databox.functionsByName[functionCall.functionName].prices;
      const pricePerQuery = prices[0]?.perQuery ?? 0;
      const pricePerKb = prices[0]?.addOns?.perKb ?? 0;
      const holdMicrogons = prices[0]?.minimum ?? 0;
      this.microgonsToHold += holdMicrogons;

      const payouts: PaymentProcessor['functionHolds'][0]['payouts'] = [];
      if (pricePerQuery > 0 || pricePerKb > 0) {
        payouts.push({ address: databox.paymentAddress, pricePerKb, pricePerQuery });
      }
      if (payouts.length) {
        this.functionHolds.push({
          id: functionCall.id,
          didRelease: false,
          payouts,
          heldMicrogons: holdMicrogons,
        });
      }
      for (const price of prices) minimumPrice += price.minimum ?? 0;
    }

    if (minimumPrice > 0 && !this.payment?.giftCard && !this.payment?.micronote) {
      throw new MicronotePaymentRequiredError('This databox requires payment', minimumPrice);
    }
    if (!this.payment?.giftCard && !this.payment?.micronote) return true;
    if (this.microgonsToHold === 0) return true;

    await this.loadSidechain();

    if (this.payment.giftCard) {
      await this.canUseGiftCard(databox);
      await this.holdGiftCardMinimum();
    } else {
      await this.canUseMicronote();
      await this.holdMicronoteMinimum();
    }
    return true;
  }

  public releaseLocalFunctionHold(functionId: number, resultBytes: number): number {
    if (!this.holdId) return 0;

    let totalMicrogons = 0;
    const functionCall = this.functionHolds.find(x => x.id === functionId);
    if (functionCall.didRelease)
      throw new Error(`This function call was already released! (id=${functionId})`);

    for (const payout of functionCall.payouts) {
      let microgons = payout.pricePerQuery ?? 0;
      if (payout.pricePerKb) {
        microgons += Math.floor((resultBytes / 1000) * payout.pricePerKb);
      }
      if (microgons === 0) continue;
      totalMicrogons += microgons;
      this.payouts.push({ microgons, address: payout.address });
    }
    functionCall.didRelease = true;
    return totalMicrogons;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async settle(finalResultBytes: number): Promise<number> {
    if (!this.holdId) return 0;

    const payments: { [address: string]: number } = {};
    // NOTE: don't claim the settlement cost!!
    const maxMicrogons = this.fundingBalance - this.sidechainSettings.settlementFeeMicrogons;
    let allocatedMicrogons = 0;
    let totalMicrogons = 0;
    for (const payout of this.payouts) {
      let microgons = payout.microgons;
      totalMicrogons += microgons;
      if (allocatedMicrogons + microgons > maxMicrogons) {
        microgons = maxMicrogons - allocatedMicrogons;
        allocatedMicrogons = maxMicrogons;
      } else {
        allocatedMicrogons += microgons;
      }

      payments[payout.address] ??= 0;
      payments[payout.address] += microgons;
    }

    if (this.payment?.giftCard && this.holdId) {
      const total = Object.values(payments).reduce((a, b) => a + b, 0);
      await this.sidechain.giftCards.settleHold(this.payment.giftCard.id, this.holdId, total);
      return total;
    }

    const isFinal = !!this.holdAuthorizationCode;
    const result = await this.sidechain.settleMicronote(
      this.payment.micronote.micronoteId,
      this.payment.micronote.batchSlug,
      this.holdId,
      payments,
      isFinal,
    );

    // if nsf, claim the funds that are allocated, but do not return the query result
    if (totalMicrogons > maxMicrogons) {
      throw new InsufficientMicronoteFundsError(this.payment.micronote.microgons, totalMicrogons);
    }

    return result?.finalCost ?? totalMicrogons;
  }

  private async canUseGiftCard(databox: IDataboxRecord): Promise<boolean> {
    if (!this.context.configuration.giftCardsAllowed || !databox.giftCardIssuerIdentity) {
      const rejector = !databox.giftCardIssuerIdentity ? 'databox' : 'Miner';
      throw new InvalidMicronoteError(`This ${rejector} is not accepting gift cards.`);
    }

    // load allowed issuer list
    const giftCardIssuers = await PaymentProcessor.getGiftCardIssuers(
      this.sidechain,
      this.payment?.giftCard?.id,
    );

    // ensure gift card is valid for this server
    for (const issuer of [
      databox.giftCardIssuerIdentity,
      this.context.configuration.giftCardsRequiredIssuerIdentity,
    ]) {
      if (!issuer) continue;
      if (!giftCardIssuers.includes(issuer))
        throw new Error(`This gift card does not include all required issuers (${issuer})`);
    }
    return true;
  }

  private async holdGiftCardMinimum(): Promise<boolean> {
    const hold = await this.sidechain.giftCards.createHold(
      this.payment.giftCard.id,
      this.payment.giftCard.redemptionKey,
      this.microgonsToHold,
    );
    this.fundingBalance = hold.remainingBalance + this.microgonsToHold;
    this.holdId = hold.holdId;
    return true;
  }

  private async canUseMicronote(): Promise<boolean> {
    const microgonsAllocated =
      this.payment.micronote.microgons - this.sidechainSettings.settlementFeeMicrogons;

    if (microgonsAllocated < this.microgonsToHold) {
      throw new InsufficientQueryPriceError(microgonsAllocated, this.microgonsToHold);
    }

    verifyMicronote(
      this.payment.micronote,
      await this.context.sidechainClientManager.getApprovedSidechainRootIdentities(),
      this.sidechainSettings.blockHeight,
    );
    return true;
  }

  private async holdMicronoteMinimum(): Promise<boolean> {
    const { micronoteId, batchSlug, holdAuthorizationCode } = this.payment.micronote;
    const hold = await this.sidechain.holdMicronoteFunds(
      micronoteId,
      batchSlug,
      this.microgonsToHold,
      holdAuthorizationCode,
    );
    if (hold.holdAuthorizationCode) {
      this.holdAuthorizationCode = hold.holdAuthorizationCode;
      // Add to the payments. This will active it for follow-on functions
      this.payment.micronote.holdAuthorizationCode = hold.holdAuthorizationCode;
    }
    if (hold.accepted) {
      this.holdId = hold.holdId;
      this.fundingBalance = hold.remainingBalance + this.microgonsToHold;
    } else {
      throw new InsufficientMicronoteFundsError(hold.remainingBalance, this.microgonsToHold);
    }
    return true;
  }

  private async loadSidechain(): Promise<void> {
    const sidechainIdentity =
      this.payment?.micronote?.sidechainIdentity ?? this.payment?.giftCard?.sidechainIdentity;
    const approvedSidechains =
      await this.context.sidechainClientManager.getApprovedSidechainRootIdentities();

    if (!approvedSidechains.has(sidechainIdentity)) {
      throw new UnapprovedSidechainError();
    }

    this.sidechain = await this.context.sidechainClientManager.withIdentity(sidechainIdentity);
    const settings = await this.sidechain.getSettings(true);
    this.sidechainSettings = {
      settlementFeeMicrogons: settings.settlementFeeMicrogons,
      blockHeight: settings.latestBlockSettings?.height ?? 0,
    };
  }

  public static getOfficialBytes(output: any): number {
    return Buffer.byteLength(Buffer.from(JSON.stringify(output), 'utf8'));
  }

  private static async getGiftCardIssuers(
    sidechain: SidechainClient,
    giftCardId: string,
  ): Promise<string[]> {
    let giftCardIssuers = PaymentProcessor.giftCardIssuersById[giftCardId];
    if (!giftCardIssuers) {
      giftCardIssuers =
        (await sidechain.giftCards.get(giftCardId)?.then(x => x.issuerIdentities)) ?? [];
      PaymentProcessor.giftCardIssuersById[giftCardId] = giftCardIssuers;
    }
    return giftCardIssuers;
  }
}
