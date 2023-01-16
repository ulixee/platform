import { IPayment } from '@ulixee/specification';
import SidechainClient from '@ulixee/sidechain';
import verifyMicronote from '@ulixee/sidechain/lib/verifyMicronote';
import { UnapprovedSidechainError } from '@ulixee/sidechain/lib/errors';
import Datastore from '@ulixee/datastore';
import CreditsTable from '@ulixee/datastore/lib/CreditsTable';
import IDatastoreManifest from '@ulixee/specification/types/IDatastoreManifest';
import {
  InsufficientMicronoteFundsError,
  InsufficientQueryPriceError,
  MaxSurgePricePerQueryExceeededError,
  MicronotePaymentRequiredError,
} from './errors';
import IDatastoreApiContext from '../interfaces/IDatastoreApiContext';

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
    private datastore: Datastore,
    readonly context: Pick<IDatastoreApiContext, 'configuration' | 'sidechainClientManager'>,
  ) {}

  public async createHold(
    manifest: IDatastoreManifest,
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
      const prices = manifest.functionsByName[functionCall.functionName].prices;
      const pricePerQuery = prices[0]?.perQuery ?? 0;
      const pricePerKb = prices[0]?.addOns?.perKb ?? 0;
      const holdMicrogons = prices[0]?.minimum ?? pricePerQuery ?? 0;
      this.microgonsToHold += holdMicrogons;

      const payouts: PaymentProcessor['functionHolds'][0]['payouts'] = [];
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
      for (const price of prices) minimumPrice += price.minimum ?? 0;
    }

    if (minimumPrice > 0 && !this.payment?.credits && !this.payment?.micronote) {
      throw new MicronotePaymentRequiredError('This Datastore requires payment.', minimumPrice);
    }
    if (!this.payment?.credits && !this.payment?.micronote) return true;
    if (this.microgonsToHold === 0) return true;

    if (this.payment.credits) {
      const credits = this.datastore.tables[CreditsTable.tableName];
      if (!credits) throw new Error('This Datastore does not support Credits.');
      const { id, secret } = this.payment.credits;
      const remainingBalance = await credits.hold(id, secret, this.microgonsToHold);
      this.fundingBalance = remainingBalance + this.microgonsToHold;
      this.holdId = id;
    } else {
      await this.loadSidechain();
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

  public async settle(finalResultBytes: number): Promise<number> {
    if (!this.holdId) return 0;

    if (this.functionHolds.length === 1 && !this.functionHolds[0].didRelease) {
      this.releaseLocalFunctionHold(this.functionHolds[0].id, finalResultBytes);
    }

    const payments: { [address: string]: number } = {};
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
      } else {
        allocatedMicrogons += microgons;
      }

      payments[payout.address] ??= 0;
      payments[payout.address] += microgons;
    }

    if (this.payment?.credits && this.holdId) {
      const total = Object.values(payments).reduce((a, b) => a + b, 0);
      const { id } = this.payment.credits;
      await this.datastore.tables[CreditsTable.tableName].finalize(id, this.microgonsToHold, total);
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
    const sidechainIdentity = this.payment?.micronote?.sidechainIdentity;
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
}
