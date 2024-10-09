import { MainchainClient } from '@argonprotocol/localchain';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import { IPayment } from '@ulixee/platform-specification';
import IPaymentServiceApiTypes from '@ulixee/platform-specification/datastore/PaymentServiceApis';
import { IPaymentMethod } from '@ulixee/platform-specification/types/IPayment';
import Identity from '@ulixee/platform-utils/lib/Identity';
import Env from '../env';
import { LocalchainWithSync } from '../index';
import IDatastoreHostLookup from '../interfaces/IDatastoreHostLookup';
import ILocalchainConfig from '../interfaces/ILocalchainConfig';
import IPaymentService, {
  ICredit,
  IPaymentEvents,
  IPaymentReserver,
} from '../interfaces/IPaymentService';
import DatastoreApiClients from '../lib/DatastoreApiClients';
import DatastoreLookup from '../lib/DatastoreLookup';
import ArgonReserver, { IChannelHoldAllocationStrategy } from './ArgonReserver';
import BrokerChannelHoldSource from './BrokerChannelHoldSource';
import CreditReserver from './CreditReserver';
import LocalchainChannelHoldSource from './LocalchainChannelHoldSource';

/**
 * A PaymentService that activates credits and includes an optional ArgonReserver
 */
export default class DefaultPaymentService
  extends TypedEventEmitter<IPaymentEvents>
  implements IPaymentService
{
  public readonly creditsByDatastoreId: { [datastoreId: string]: CreditReserver[] } = {};
  public readonly creditsPath: string = CreditReserver.defaultBasePath;

  private readonly argonReserver?: IPaymentReserver;
  private readonly paymentUuidToService: { [uuid: string]: WeakRef<IPaymentService> } = {};
  private readonly creditsAutoLoaded: Promise<any>;

  constructor(
    argonReserver?: IPaymentReserver,
    loadCreditFromPath: string | 'default' = 'default',
  ) {
    super();

    this.argonReserver = argonReserver;
    if (loadCreditFromPath) {
      this.creditsPath =
        loadCreditFromPath === 'default' ? CreditReserver.defaultBasePath : loadCreditFromPath;
      this.creditsAutoLoaded = this.loadCredits().catch(() => null);
    }

    this.argonReserver?.addEventEmitter(this, [
      'reserved',
      'finalized',
      'createdChannelHold',
      'updateSettlement',
    ]);
  }

  public async credits(): Promise<ICredit[]> {
    const credits = [];
    for (const services of Object.values(this.creditsByDatastoreId) ?? []) {
      credits.push(...services.map(x => x.credit));
    }
    return credits;
  }

  public async loadCredits(path?: string): Promise<void> {
    if (this.creditsAutoLoaded) {
      if (!path || path === this.creditsPath) return this.creditsAutoLoaded;
    }
    path ??= this.creditsPath;
    const credits = await CreditReserver.loadAll(path);
    for (const credit of credits) {
      this.addCredit(credit);
    }
  }

  public addCredit(service: CreditReserver): void {
    this.creditsByDatastoreId[service.datastoreId] ??= [];
    this.creditsByDatastoreId[service.datastoreId].push(service);
    service.addEventEmitter(this, ['reserved', 'finalized']);
  }

  public async close(): Promise<void> {
    for (const services of Object.values(this.creditsByDatastoreId) ?? []) {
      await Promise.allSettled(services.map(x => x.close()));
    }
    await this.argonReserver?.close();
  }

  public async attachCredit(
    url: string,
    credit: IPaymentMethod['credits'],
    datastoreLookup?: IDatastoreHostLookup,
  ): Promise<void> {
    let mainchainClientToClose: Promise<MainchainClient>;
    if (!datastoreLookup && Env.argonMainchainUrl) {
      mainchainClientToClose = MainchainClient.connect(Env.argonMainchainUrl, 10e3);
      datastoreLookup = new DatastoreLookup(mainchainClientToClose);
    }
    try {
      const service = await CreditReserver.lookup(url, credit, datastoreLookup, this.creditsPath);
      this.addCredit(service);
    } finally {
      if (mainchainClientToClose) {
        await mainchainClientToClose.then(x => x.close());
      }
    }
  }

  public async reserve(
    info: IPaymentServiceApiTypes['PaymentService.reserve']['args'],
  ): Promise<IPayment> {
    if (!info.microgons) return null;

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
    if (!this.argonReserver) {
      if (datastoreCredits > 0) {
        throw new Error(
          `Your datastore credit${datastoreCredits > 1} don't have enough remaining funds. Connect another payment source to continue.`,
        );
      }
      throw new Error(
        "You don't have any valid payment methods configured. Please install any credits you have or connect a localchain.",
      );
    }
    if (!info.recipient) {
      throw new Error(
        "This Datastore hasn't configured a payment address, so it can't receive Argons as payment.",
      );
    }

    const payment = await this.argonReserver?.reserve(info);
    if (payment) {
      this.paymentUuidToService[payment.uuid] = new WeakRef(this.argonReserver);
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

  public static async fromLocalchain(
    config: ILocalchainConfig,
    channelHoldAllocationStrategy?: IChannelHoldAllocationStrategy,
    apiClients?: DatastoreApiClients,
    loadCreditsFromPath?: string | 'default',
  ): Promise<DefaultPaymentService> {
    const localchain = await LocalchainWithSync.load(config);
    return await DefaultPaymentService.fromOpenLocalchain(
      localchain,
      channelHoldAllocationStrategy,
      apiClients,
      loadCreditsFromPath,
    );
  }

  public static async fromOpenLocalchain(
    localchain: LocalchainWithSync,
    channelHoldAllocationStrategy?: IChannelHoldAllocationStrategy,
    apiClients?: DatastoreApiClients,
    loadCreditsFromPath?: string | 'default',
  ): Promise<DefaultPaymentService> {
    const datastoreLookup = new DatastoreLookup(localchain.mainchainClient);
    const channelHoldSource = new LocalchainChannelHoldSource(
      localchain,
      await localchain.address,
      datastoreLookup,
      localchain.mainchainLoaded,
    );
    const reserver = new ArgonReserver(
      channelHoldSource,
      channelHoldAllocationStrategy,
      apiClients,
    );
    await reserver.load();
    return new DefaultPaymentService(reserver, loadCreditsFromPath);
  }

  public static async fromBroker(
    brokerHost: string,
    identityConfig: { pemPath: string; passphrase?: string } | { pem: string },
    channelHoldAllocationStrategy?: IChannelHoldAllocationStrategy,
    apiClients?: DatastoreApiClients,
    loadCreditsFromPath?: string | 'default',
  ): Promise<DefaultPaymentService> {
    const identity =
      'pemPath' in identityConfig
        ? Identity.loadFromFile(
            identityConfig.pemPath,
            identityConfig.passphrase ? { keyPassphrase: identityConfig.passphrase } : undefined,
          )
        : Identity.loadFromPem(identityConfig.pem);
    const channelHoldSource = new BrokerChannelHoldSource(brokerHost, identity);
    const reserver = new ArgonReserver(
      channelHoldSource,
      channelHoldAllocationStrategy,
      apiClients,
    );
    await reserver.load();
    return new DefaultPaymentService(reserver, loadCreditsFromPath);
  }
}
