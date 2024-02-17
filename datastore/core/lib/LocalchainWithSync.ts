import Logger from '@ulixee/commons/lib/Logger';
import DatastoreApiClients from '@ulixee/datastore/lib/DatastoreApiClients';
import DatastoreLookup from '@ulixee/datastore/lib/DatastoreLookup';
import LocalchainPaymentService, {
  IPaymentConfig,
} from '@ulixee/datastore/payments/LocalchainPaymentService';
import {
  DataDomainStore,
  KeystorePasswordOption,
  Localchain,
  OpenEscrowsStore,
  Signer,
} from '@ulixee/localchain';
import { gettersToObject } from '@ulixee/platform-utils/lib/objectUtils';
import * as Path from 'node:path';

const { log } = Logger(module);

export default class LocalchainWithSync {
  public signer = new Signer();
  public get dataDomains(): DataDomainStore {
    return this.#localchain.dataDomains;
  }

  public get openEscrows(): OpenEscrowsStore {
    return this.#localchain.openEscrows;
  }

  #localchain: Localchain;
  public datastoreLookup: DatastoreLookup;

  private nextTick: NodeJS.Timeout;

  constructor(readonly localchainConfig?: ILocalchainConfig) {
    this.localchainConfig.votesAddress ??= this.localchainConfig.taxAddress;
  }

  public async load(): Promise<void> {
    const { mainchainUrl, localchainPath, keystorePath, keystorePasswordOption } =
      this.localchainConfig;
    const baseDir = localchainPath ?? Localchain.getDefaultPath();
    this.#localchain = await Localchain.load({
      dbPath: Path.join(baseDir, 'localchain.db'),
      mainchainUrl,
    });
    if (!keystorePath) throw new Error('The Datastore-native Localchain requires a keystore path');
    await this.signer.attachKeystore(keystorePath, keystorePasswordOption ?? {});
    // remove password from memory
    if (Buffer.isBuffer(keystorePasswordOption?.password)) {
      keystorePasswordOption.password.fill(0);
      delete keystorePasswordOption.password;
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
      this.signer,
      {
        escrowMilligonsStrategy: this.localchainConfig.upstreamEscrowMilligonsStrategy ?? {
          type: 'multiplier',
          queries: 100,
        },
        datastoreFundingAddress: this.localchainConfig.upstreamEscrowFundingAccount,
        taxAddress: this.localchainConfig.taxAddress,
      },
      datastoreClients,
    );
  }

  private scheduleNextTick(): void {
    clearTimeout(this.nextTick);
    this.nextTick = setTimeout(async () => {
      try {
        const result = await this.#localchain.balanceSync.sync(
          {
            escrowClaimsSendToAddress: this.localchainConfig.upstreamEscrowFundingAccount,
            escrowTaxAddress: this.localchainConfig.taxAddress,
            votesAddress: this.localchainConfig.votesAddress,
          },
          this.signer,
        );
        log.info('Escrow Manager Sync result', {
          // have to weirdly jsonify
          balanceChanges: result.balanceChanges.map(gettersToObject),
          notarizations: result.escrowNotarizations.map(gettersToObject),
        } as any);
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
  taxAddress?: string;
  /**
   * If this setup uses cloned datastores, this account will fund the escrows
   */
  upstreamEscrowFundingAccount?: string;
  /**
   * Strategy to use to create upstream escrows. Defaults to a 100 query multiplier
   */
  upstreamEscrowMilligonsStrategy?: IPaymentConfig['escrowMilligonsStrategy'];
  /**
   * Defaults to the same as taxAddress
   */
  votesAddress?: string;
  keystorePath: string;
  keystorePasswordOption: KeystorePasswordOption;
}
