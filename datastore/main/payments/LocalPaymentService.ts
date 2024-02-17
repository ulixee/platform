import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import { IPayment } from '@ulixee/platform-specification';
import IPaymentServiceApiTypes from '@ulixee/platform-specification/datastore/PaymentServiceApis';
import { IPaymentMethod } from '@ulixee/platform-specification/types/IPayment';
import ArgonUtils from '@ulixee/platform-utils/lib/ArgonUtils';
import IDatastoreHostLookup from '../interfaces/IDatastoreHostLookup';
import IDatastoreMetadata from '../interfaces/IDatastoreMetadata';
import IPaymentService, { ICredit, IUserBalance } from '../interfaces/IPaymentService';
import DatastoreLookup from '../lib/DatastoreLookup';
import CreditPaymentService from './CreditPaymentService';
import LocalchainPaymentService from './LocalchainPaymentService';

export interface IPaymentEvents {
  reserved: { datastoreId: string; payment: IPayment; remainingBalance: number };
  finalized: {
    paymentUuid: string;
    initialMicrogons: number;
    finalMicrogons: number;
    remainingBalance: number;
  };
  createdEscrow: { escrowId: string; datastoreId: string; allocatedMilligons: bigint };
  updateSettlement: {
    escrowId: string;
    settledMilligons: bigint;
    remaining: bigint;
    datastoreId: string;
  };
}

/**
 * A LocalPaymentService combines credits with a localchain payment service.
 */
export default class LocalPaymentService
  extends TypedEventEmitter<IPaymentEvents>
  implements IPaymentService
{
  public readonly creditsByDatastoreId: { [datastoreId: string]: CreditPaymentService[] } = {};
  public localchainPaymentService?: LocalchainPaymentService;

  private readonly paymentUuidToService: { [uuid: string]: WeakRef<IPaymentService> } = {};
  private creditsAutoLoaded: Promise<any>;
  private creditsPath: string = CreditPaymentService.defaultBasePath;

  constructor(
    localchainPaymentService?: LocalchainPaymentService,
    loadCreditFromPath: string | 'default' = 'default',
  ) {
    super();
    this.localchainPaymentService = localchainPaymentService;
    if (loadCreditFromPath) {
      this.creditsPath =
        loadCreditFromPath === 'default' ? LocalchainPaymentService.storePath : loadCreditFromPath;
      this.creditsAutoLoaded = this.loadCredits().catch(() => null);
    }

    this.localchainPaymentService?.addEventEmitter(this, [
      'reserved',
      'finalized',
      'createdEscrow',
      'updateSettlement',
    ]);
  }

  public async getBalance(): Promise<IUserBalance> {
    const localchainBalance = (await this.localchainPaymentService?.getBalance()) ?? {
      credits: [],
      depositBalance: 0n,
      taxBalance: 0n,
      walletBalance: `0`,
    };
    const credits = await this.credits();
    const creditBalance = credits.reduce((sum, x) => sum + x.remaining, 0);
    const creditMilligons = ArgonUtils.microgonsToMilligons(creditBalance);

    const walletBalance = ArgonUtils.format(
      localchainBalance.depositBalance + creditMilligons,
      'milligons',
      'argons',
    );

    return {
      credits,
      depositBalance: localchainBalance.depositBalance,
      taxBalance: localchainBalance.taxBalance,
      walletBalance,
    };
  }

  public async credits(): Promise<ICredit[]> {
    const credits = [];
    for (const services of Object.values(this.creditsByDatastoreId) ?? []) {
      credits.push(...services.map(x => x.credit));
    }
    return credits;
  }

  public async loadCredits(path?: string): Promise<void> {
    path ??= this.creditsPath;
    const credits = await CreditPaymentService.loadAll(path);
    for (const credit of credits) {
      this.addCredit(credit);
    }
  }

  public async getDatastoreHostLookup(): Promise<IDatastoreHostLookup | null> {
    const mainchainClient = await this.localchainPaymentService?.localchain?.mainchainClient;
    if (mainchainClient) {
      return new DatastoreLookup(mainchainClient);
    }
    return null;
  }

  public addCredit(service: CreditPaymentService): void {
    this.creditsByDatastoreId[service.datastoreId] ??= [];
    this.creditsByDatastoreId[service.datastoreId].push(service);
    service.addEventEmitter(this, ['reserved', 'finalized']);
  }

  public async close(): Promise<void> {
    for (const services of Object.values(this.creditsByDatastoreId) ?? []) {
      await Promise.allSettled(services.map(x => x.close()));
    }
    await this.localchainPaymentService?.close();
  }

  public async attachCredit(
    url: string,
    credit: IPaymentMethod['credits'],
    datastoreLookup?: IDatastoreHostLookup,
  ): Promise<void> {
    const service = await CreditPaymentService.lookup(
      url,
      credit,
      datastoreLookup ?? (await this.getDatastoreHostLookup()),
      this.creditsPath,
    );
    this.addCredit(service);
  }

  public async whitelistRemotes(
    manifest: IDatastoreMetadata,
    datastoreLookup: IDatastoreHostLookup,
  ): Promise<void> {
    if (!manifest.remoteDatastores) return;
    await this.localchainPaymentService?.whitelistRemotes(manifest, datastoreLookup);
    for (const [remoteSource, datastoreUrl] of Object.entries(manifest.remoteDatastores)) {
      const credit = manifest.remoteDatastoreEmbeddedCredits[remoteSource];
      if (credit) {
        const service = await CreditPaymentService.lookup(
          datastoreUrl,
          credit,
          datastoreLookup,
          this.creditsPath,
        );
        this.addCredit(service);
      }
    }
  }

  public async reserve(
    info: IPaymentServiceApiTypes['PaymentService.reserve']['args'],
  ): Promise<IPayment> {
    if (!info.microgons || !info.recipient) return null;
    await this.creditsAutoLoaded;
    let datastoreCredits = 0;
    for (const credit of this.creditsByDatastoreId[info.id] ?? []) {
      datastoreCredits += 1;
      if (credit.hasBalance(info.microgons)) {
        const payment = await credit.reserve(info);
        if (payment) {
          this.paymentUuidToService[payment.uuid] = new WeakRef(credit);
          return payment;
        }
      }
    }
    if (!this.localchainPaymentService) {
      if (datastoreCredits > 0) {
        throw new Error(
          `Your datastore credit${datastoreCredits > 1} don't have enough remaining funds. Connect another payment source to continue.`,
        );
      }
      throw new Error(
        "You don't have any valid payment methods configured. Please install any credits you have or connect a localchain.",
      );
    }
    const payment = await this.localchainPaymentService?.reserve(info);
    if (payment) {
      this.paymentUuidToService[payment.uuid] = new WeakRef(this.localchainPaymentService);
    }
    return payment;
  }

  public async finalize(
    info: IPaymentServiceApiTypes['PaymentService.finalize']['args'],
  ): Promise<void> {
    const service = this.paymentUuidToService[info.uuid]?.deref();
    delete this.paymentUuidToService[info.uuid];

    await service?.finalize(info);
  }
}
