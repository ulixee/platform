import { getDataDirectory } from '@ulixee/commons/lib/dirUtils';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import { readFileAsJson, safeOverwriteFile } from '@ulixee/commons/lib/fileUtils';
import Logger from '@ulixee/commons/lib/Logger';
import Queue from '@ulixee/commons/lib/Queue';
import TypeSerializer from '@ulixee/commons/lib/TypeSerializer';
import { toUrl } from '@ulixee/commons/lib/utils';
import {
  DataTLD,
  ESCROW_MINIMUM_SETTLEMENT,
  KeystorePasswordOption,
  Localchain,
  MainchainClient,
  OpenEscrow,
} from '@ulixee/localchain';
import { IPayment } from '@ulixee/platform-specification';
import IPaymentServiceApiTypes from '@ulixee/platform-specification/datastore/PaymentServiceApis';
import IBalanceChange from '@ulixee/platform-specification/types/IBalanceChange';
import ArgonUtils from '@ulixee/platform-utils/lib/ArgonUtils';
import { nanoid } from 'nanoid';
import * as Path from 'node:path';
import env from '../env';
import IDatastoreHostLookup from '../interfaces/IDatastoreHostLookup';
import IDatastoreMetadata from '../interfaces/IDatastoreMetadata';
import IPaymentService, { IPaymentDetails, IWallet } from '../interfaces/IPaymentService';
import DatastoreApiClients from '../lib/DatastoreApiClients';
import { IPaymentEvents } from './LocalPaymentService';

export { DataTLD };

const { log } = Logger(module);

export interface IPaymentConfig {
  escrowMilligonsStrategy:
    | { type: 'default'; milligons: bigint }
    | { type: 'multiplier'; queries: number };
}

type IPaymentDetailsByDatastoreId = { [datastoreId: string]: IPaymentDetails[] };

/**
 * Singleton that will track payments for each escrow for a datastore
 */
export default class LocalchainPaymentService
  extends TypedEventEmitter<IPaymentEvents>
  implements IPaymentService
{
  public static storePath = `${getDataDirectory()}/ulixee/payments.json`;
  public readonly paymentsByDatastoreId: IPaymentDetailsByDatastoreId = {};

  /**
   * Security feature to enable only specific datastores to create escrows.
   */
  private datastoreIdsAllowedToCreateEscrows: Set<{ host: string; id: string }>;
  /**
   * Indicates which datastores have been loaded into the IPaymentService['whitelistRemotes'] call
   */
  private loadedDatastoreMetadataIds = new Set<string>();
  private paymentsPendingFinalization: {
    [uuid: string]: { microgons: number; datastoreId: string; paymentId: string };
  } = {};

  private readonly openEscrowsById: { [escrowId: string]: OpenEscrow } = {};
  private readonly reserveQueueByDatastoreId: { [url: string]: Queue } = {};
  private readonly escrowQueue = new Queue('ESCROW QUEUE', 1);
  private needsSave = false;
  private needsApiClientsClose = false;
  private loadPromise: Promise<any>;
  private saveInterval: NodeJS.Timeout;

  constructor(
    public localchain: Localchain,
    private config: IPaymentConfig,
    public apiClients: DatastoreApiClients | null,
  ) {
    super();
    if (!this.apiClients) {
      this.apiClients = new DatastoreApiClients();
      this.needsApiClientsClose = true;
    }
    this.saveInterval = setInterval(() => this.save(), 5e3).unref();
  }

  public async close(): Promise<void> {
    clearInterval(this.saveInterval);
    await this.save();
    if (this.needsApiClientsClose) {
      await this.apiClients.close();
    }
  }

  public async getWallet(): Promise<IWallet> {
    const accountOverview = await this.localchain.accountOverview();

    const formattedBalance = ArgonUtils.format(accountOverview.balance, 'milligons', 'argons');
    return {
      credits: [],
      accounts: [accountOverview],
      primaryAddress: await this.localchain.address,
      formattedBalance,
    };
  }

  public async connectToMainchain(mainchainUrl: string, timeoutMs = 10e3): Promise<void> {
    const mainchain = await MainchainClient.connect(mainchainUrl, timeoutMs);
    await this.localchain.attachMainchain(mainchain);
  }

  public async load(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = (async () => {
      const paymentsByDatastore = await readFileAsJson<IPaymentDetailsByDatastoreId>(
        LocalchainPaymentService.storePath,
      ).catch(() => ({}));
      Object.assign(this.paymentsByDatastoreId, paymentsByDatastore);
    })();
  }

  public async save(): Promise<void> {
    if (!this.needsSave || !this.loadPromise) return;
    this.needsSave = false;
    await this.loadPromise;
    await this.writeToDisk().catch(error => {
      log.error("Error saving LocalchainPaymentService's payments", { error });
    });
  }

  public async reserve(
    paymentInfo: IPaymentServiceApiTypes['PaymentService.reserve']['args'],
  ): Promise<IPayment> {
    const microgons = paymentInfo.microgons ?? 0;
    if (!microgons || !paymentInfo.recipient) return null;
    let datastoreHost = paymentInfo.host;
    const datastoreId = paymentInfo.id;
    datastoreHost = toUrl(datastoreHost).host;
    await this.load();
    this.reserveQueueByDatastoreId[datastoreId] ??= new Queue();
    this.paymentsByDatastoreId[datastoreId] ??= [];

    return await this.reserveQueueByDatastoreId[datastoreId].run(async () => {
      this.paymentsByDatastoreId[datastoreId] = this.paymentsByDatastoreId[datastoreId].filter(
        x => x.remaining > 0 && (!x.expirationDate || x.expirationDate > new Date()),
      );

      for (const paymentOption of this.paymentsByDatastoreId[datastoreId]) {
        if (paymentOption.remaining >= microgons) {
          if (paymentOption.paymentMethod.escrow?.id) {
            if (paymentOption.host !== datastoreHost) continue;
          }
          return await this.charge(paymentOption, microgons);
        }
      }

      const milligons = this.calculateEscrowMilligons(datastoreId, microgons);
      const details = await this.createEscrow(paymentInfo, milligons);
      return await this.charge(details, microgons);
    });
  }

  public async finalize(
    paymentInfo: IPaymentServiceApiTypes['PaymentService.finalize']['args'],
  ): Promise<void> {
    const { microgons, finalMicrogons, uuid } = paymentInfo;

    const payment = this.paymentsPendingFinalization[uuid];
    if (payment) {
      delete this.paymentsPendingFinalization[uuid];
      const details = this.paymentsByDatastoreId[payment.datastoreId].find(
        x =>
          x.paymentMethod.credits?.id === payment.paymentId ||
          x.paymentMethod.escrow?.id === payment.paymentId,
      );
      details.remaining += microgons - finalMicrogons;

      this.needsSave = true;
      this.emit('finalized', {
        paymentUuid: uuid,
        initialMicrogons: microgons,
        finalMicrogons,
        remainingBalance: details.remaining,
      });
    }
  }

  public async createEscrow(
    paymentInfo: IPaymentServiceApiTypes['PaymentService.reserve']['args'],
    milligons: bigint,
  ): Promise<IPaymentDetails> {
    const { id, host, domain, version } = paymentInfo;
    if (
      this.datastoreIdsAllowedToCreateEscrows &&
      !this.datastoreIdsAllowedToCreateEscrows.has({ id, host })
    )
      throw new Error('Cannot create an escrow for a non-whitelisted datastore.');

    return await this.escrowQueue.run(async () => {
      const openEscrow = await this.localchain.transactions.createEscrow(
        milligons,
        paymentInfo.recipient.address,
        domain,
        paymentInfo.recipient.notaryId,
      );
      if (milligons < ESCROW_MINIMUM_SETTLEMENT) {
        milligons = ESCROW_MINIMUM_SETTLEMENT;
      }

      const escrowJson: IBalanceChange = JSON.parse((await openEscrow.exportForSend()).toString());

      const apiClient = this.apiClients.get(host);
      await apiClient.registerEscrow(id, escrowJson);
      const escrow = await openEscrow.escrow;
      const expirationMillis = this.localchain.ticker.timeForTick(escrow.expirationTick);
      const escrowId = escrow.id;
      const allocated = Number(escrow.holdAmount) * 1000;
      const entry: IPaymentDetails = {
        paymentMethod: {
          escrow: {
            id: escrowId,
            settledSignature: Buffer.from(escrow.settledSignature),
            settledMilligons: escrow.settledAmount,
          },
        },
        id,
        version,
        remaining: allocated,
        expirationDate: new Date(Number(expirationMillis)),
        host,
        allocated,
      };
      this.emit('createdEscrow', {
        escrowId,
        datastoreId: id,
        allocatedMilligons: escrow.holdAmount,
      });
      this.openEscrowsById[escrowId] = openEscrow;
      this.paymentsByDatastoreId[id] ??= [];
      this.paymentsByDatastoreId[id].push(entry);
      return entry;
    });
  }

  public async whitelistRemotes(
    datastoreMetadata: IDatastoreMetadata,
    datastoreLookup: IDatastoreHostLookup,
  ): Promise<void> {
    if (this.loadedDatastoreMetadataIds.has(datastoreMetadata.id)) return;
    this.loadedDatastoreMetadataIds.add(datastoreMetadata.id);
    this.datastoreIdsAllowedToCreateEscrows ??= new Set();
    if (!datastoreMetadata.remoteDatastores) return;
    for (const datastoreUrl of Object.values(datastoreMetadata.remoteDatastores)) {
      const datastoreHost = await datastoreLookup.getHostInfo(datastoreUrl);
      this.datastoreIdsAllowedToCreateEscrows.add({
        id: datastoreHost.datastoreId,
        host: datastoreHost.host,
      });
    }
  }

  protected calculateEscrowMilligons(_datastoreId: string, microgons: number): bigint {
    if (this.config.escrowMilligonsStrategy.type === 'default') {
      return this.config.escrowMilligonsStrategy.milligons;
    }
    if (this.config.escrowMilligonsStrategy.type === 'multiplier') {
      return ArgonUtils.microgonsToMilligons(
        microgons * this.config.escrowMilligonsStrategy.queries,
      );
    }
    throw new Error(
      'Unknown escrow allocation strategy. Please specify in `config.escrowMilligonsStrategy.type`.',
    );
  }

  private async charge(details: IPaymentDetails, microgons: number): Promise<IPayment> {
    if (details.paymentMethod.escrow?.id) {
      await this.updateSettlement(details, microgons);
    }
    details.remaining -= microgons;
    this.needsSave = true;

    const payment: IPayment = {
      uuid: nanoid(),
      microgons,
      ...details.paymentMethod,
    };
    this.paymentsPendingFinalization[payment.uuid] = {
      microgons,
      datastoreId: details.id,
      paymentId: details.paymentMethod.credits?.id ?? details.paymentMethod.escrow?.id,
    };
    this.emit('reserved', {
      payment,
      datastoreId: details.id,
      remainingBalance: details.remaining,
    });
    return payment;
  }

  private async updateSettlement(details: IPaymentDetails, addedMicrogons: number): Promise<void> {
    const escrow = details.paymentMethod.escrow;
    if (!escrow) return;
    const toRelease = Math.ceil((details.allocated - details.remaining + addedMicrogons) / 1000);
    if (toRelease * 1000 > details.allocated) {
      throw new Error('Cannot release more than the allocated amount');
    }
    if (toRelease > escrow.settledMilligons) {
      this.openEscrowsById[escrow.id] ??= await this.localchain.openEscrows.get(escrow.id);
      const openEscrow = this.openEscrowsById[escrow.id];
      const result = await openEscrow.sign(BigInt(toRelease));
      escrow.settledMilligons = result.milligons;
      escrow.settledSignature = Buffer.from(result.signature);
      this.needsSave = true;
      this.emit('updateSettlement', {
        escrowId: escrow.id,
        settledMilligons: escrow.settledMilligons,
        datastoreId: details.id,
        remaining: (await openEscrow.escrow).holdAmount - escrow.settledMilligons,
      });
    }
  }

  private async writeToDisk(): Promise<void> {
    await safeOverwriteFile(
      LocalchainPaymentService.storePath,
      TypeSerializer.stringify(this.paymentsByDatastoreId, { format: true }),
    );
  }

  public static async loadLocalchain(config?: {
    localchainPath?: string;
    mainchainUrl?: string;
    keystorePassword?: KeystorePasswordOption;
  }): Promise<Localchain> {
    const { mainchainUrl: configMainchainUrl, localchainPath } = config ?? {};
    let defaultPath = localchainPath ?? Localchain.getDefaultPath();
    if (!defaultPath.endsWith('.db')) {
      defaultPath = Path.join(defaultPath, 'primary.db');
    }
    const mainchainUrl = configMainchainUrl ?? env.mainchainUrl;
    log.info("Loading LocalchainPaymentService's localchain", {
      localchainPath: defaultPath,
      mainchainUrl: configMainchainUrl,
    } as any);
    let keystorePassword = config?.keystorePassword;
    if (
      keystorePassword &&
      !keystorePassword.password &&
      !keystorePassword.passwordFile &&
      !keystorePassword.interactiveCli
    ) {
      keystorePassword = undefined;
    }
    return mainchainUrl
      ? await Localchain.load({ mainchainUrl, path: defaultPath, keystorePassword })
      : await Localchain.loadWithoutMainchain(
          defaultPath,
          {
            genesisUtcTime: env.genesisUtcTime,
            tickDurationMillis: env.tickDurationMillis,
            ntpPoolUrl: env.ntpPoolUrl,
          },
          keystorePassword,
        );
  }

  public static async load(
    config?: Partial<IPaymentConfig> & {
      localchainPath?: string;
      mainchainUrl?: string;
      keystorePassword?: KeystorePasswordOption;
      apiClients?: DatastoreApiClients;
    },
  ): Promise<LocalchainPaymentService> {
    const localchain = await this.loadLocalchain(config);

    return new LocalchainPaymentService(
      localchain,
      {
        escrowMilligonsStrategy: config?.escrowMilligonsStrategy ?? {
          type: 'multiplier',
          queries: 100,
        },
      },
      config?.apiClients,
    );
  }
}
