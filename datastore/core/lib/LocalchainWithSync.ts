import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import Logger from '@ulixee/commons/lib/Logger';
import DatastoreApiClients from '@ulixee/datastore/lib/DatastoreApiClients';
import DatastoreLookup from '@ulixee/datastore/lib/DatastoreLookup';
import LocalchainPaymentService, {
  IPaymentConfig,
} from '@ulixee/datastore/payments/LocalchainPaymentService';
import {
  BalanceSyncResult,
  DataDomainStore,
  KeystorePasswordOption,
  Localchain,
  OpenEscrowsStore,
} from '@ulixee/localchain';
import { gettersToObject } from '@ulixee/platform-utils/lib/objectUtils';

const { log } = Logger(module);

export default class LocalchainWithSync extends TypedEventEmitter<{ sync: BalanceSyncResult }> {
  public get dataDomains(): DataDomainStore {
    return this.#localchain.dataDomains;
  }

  public get openEscrows(): OpenEscrowsStore {
    return this.#localchain.openEscrows;
  }

  #localchain: Localchain;
  public datastoreLookup: DatastoreLookup;
  public address: Promise<string>;
  public enableLogging = true;

  private nextTick: NodeJS.Timeout;

  constructor(readonly localchainConfig?: ILocalchainConfig) {
    super();
  }

  public async load(): Promise<void> {
    const { mainchainUrl, localchainPath, keystorePassword } = this.localchainConfig ?? {};
    this.#localchain = await Localchain.load({
      path: localchainPath,
      mainchainUrl,
      keystorePassword,
    });
    this.address = this.#localchain.address.catch(() => null);
    // remove password from memory
    if (Buffer.isBuffer(keystorePassword?.password)) {
      keystorePassword.password.fill(0);
      delete keystorePassword.password;
    }
    this.datastoreLookup = new DatastoreLookup(await this.#localchain.mainchainClient);
    this.scheduleNextTick();
  }

  public timeForTick(tick: number): Date {
    return new Date(Number(this.#localchain.ticker.timeForTick(tick)));
  }

  public createPaymentService(datastoreClients: DatastoreApiClients): LocalchainPaymentService {
    return new LocalchainPaymentService(
      this.#localchain,
      {
        escrowMilligonsStrategy: this.localchainConfig.upstreamEscrowMilligonsStrategy ?? {
          type: 'multiplier',
          queries: 100,
        },
      },
      datastoreClients,
    );
  }

  private scheduleNextTick(): void {
    clearTimeout(this.nextTick);
    this.nextTick = setTimeout(async () => {
      try {
        const result = await this.#localchain.balanceSync.sync({
          votesAddress: this.localchainConfig.votesAddress,
        });
        this.emit('sync', result);
        if (this.enableLogging) {
          log.info('Escrow Manager Sync result', {
            // have to weirdly jsonify
            balanceChanges: await Promise.all(result.balanceChanges.map(gettersToObject)),
            notarizations: await Promise.all(result.escrowNotarizations.map(gettersToObject)),
          } as any);
        }
      } catch (error) {
        log.error('Error synching escrow balance changes', { error });
      }
    }, Number(this.#localchain.ticker.millisToNextTick()));
  }
}

export interface ILocalchainConfig {
  mainchainUrl: string;
  notaryId: number;
  localchainPath: string;
  /**
   * Strategy to use to create upstream escrows. Defaults to a 100 query multiplier
   */
  upstreamEscrowMilligonsStrategy?: IPaymentConfig['escrowMilligonsStrategy'];
  /**
   * Must be set to enable vote creation
   */
  votesAddress?: string;
  /**
   * A password, if applicable, to the localchain
   */
  keystorePassword: KeystorePasswordOption;
}
