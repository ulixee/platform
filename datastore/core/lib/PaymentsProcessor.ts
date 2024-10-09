import Datastore from '@ulixee/datastore';
import CreditsTable from '@ulixee/datastore/lib/CreditsTable';
import PricingManager from '@ulixee/datastore/lib/PricingManager';
import { IPayment } from '@ulixee/platform-specification';
import { IDatastoreMetadataResult } from '@ulixee/platform-specification/datastore/DatastoreApis';
import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import IDatastoreApiContext from '../interfaces/IDatastoreApiContext';
import { InsufficientQueryPriceError, PaymentRequiredError } from './errors';

/**
 * 50 microgons for 1KB means:
 * 1 microgons per 20.5 bytes
 * 1MB is $0.05
 * 1GB is $52.43
 *
 * Proxy services can be 1.2c per mb base price (but that's for all page contents)
 *  ie, 12k microgons, ie, 12 microgons per kb
 *
 */
export default class PaymentsProcessor {
  public initialPrice = 0;
  public talliedPrice = 0;

  private shouldFinalize = true;

  constructor(
    private payment: IPayment,
    private datastoreId: string,
    private datastore: Datastore,
    readonly context: Pick<
      IDatastoreApiContext,
      'configuration' | 'argonPaymentProcessor'
    >,
  ) {}

  public async debit(
    queryId: string,
    manifest: IDatastoreManifest,
    entityCalls: string[],
  ): Promise<boolean> {
    const price = PricingManager.computePrice(manifest, entityCalls);
    this.initialPrice = price;
    if (price === 0) return true;

    if (!this.payment?.credits?.id && !this.payment?.channelHold?.id) {
      throw new PaymentRequiredError('This Datastore requires payment.', price);
    }

    if (price !== this.payment.microgons) {
      throw new InsufficientQueryPriceError(this.payment.microgons, price);
    }

    if (this.payment.credits) {
      const credits = this.datastore.tables[CreditsTable.tableName];
      if (!credits) throw new Error('This Datastore does not support Credits.');
      const { id, secret } = this.payment.credits;
      await credits.debit(id, secret, price);
      this.shouldFinalize = true;
    } else {
      const result = await this.context.argonPaymentProcessor.debit({
        datastoreId: this.datastoreId,
        queryId,
        payment: this.payment,
      });
      this.shouldFinalize = result.shouldFinalize;
    }
    return true;
  }

  public trackCallResult(
    _call: string,
    microgons: number,
    upstreamResult?: IDatastoreMetadataResult,
  ): number {
    let amount = microgons ?? 0;

    if (upstreamResult) amount += upstreamResult.microgons ?? 0;
    this.talliedPrice += amount;

    return amount;
  }

  public storageEngineResult(result: IDatastoreMetadataResult): void {
    this.talliedPrice += result.microgons;
  }

  public async finalize(_bytes: number): Promise<number> {
    if (this.shouldFinalize && this.payment) {
      if (this.payment.credits) {
        const diff = this.initialPrice - this.talliedPrice;
        if (diff !== 0) {
          const credits = this.datastore.tables[CreditsTable.tableName];
          await credits.finalize(this.payment.credits.id, diff);
        }
      } else {
        await this.context.argonPaymentProcessor.finalize({
          datastoreId: this.datastoreId,
          channelHoldId: this.payment.channelHold.id,
          uuid: this.payment.uuid,
          finalMicrogons: this.talliedPrice,
        });
      }
    }
    return this.talliedPrice;
  }
}
