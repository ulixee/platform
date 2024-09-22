import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import Logger from '@ulixee/commons/lib/Logger';
import {
  BalanceSync,
  BalanceSyncResult,
  DomainStore,
  KeystorePasswordOption,
  Localchain,
  LocalchainOverview,
  MainchainClient,
  MainchainTransferStore,
  OpenChannelHoldsStore,
  Transactions,
} from '@argonprotocol/localchain';
import { gettersToObject } from '@ulixee/platform-utils/lib/objectUtils';
import * as Path from 'node:path';
import Env from '../env';
import ILocalchainConfig from '../interfaces/ILocalchainConfig';
import DatastoreApiClients from '../lib/DatastoreApiClients';
import DatastoreLookup from '../lib/DatastoreLookup';
import DefaultPaymentService from './DefaultPaymentService';

const { log } = Logger(module);

if (Env.defaultDataDir) {
  Localchain.setDefaultDir(Path.join(Env.defaultDataDir, 'ulixee', 'localchain'));
}

export default class LocalchainWithSync extends TypedEventEmitter<{ sync: BalanceSyncResult }> {
  public get domains(): DomainStore {
    return this.#localchain.domains;
  }

  public get openChannelHolds(): OpenChannelHoldsStore {
    return this.#localchain.openChannelHolds;
  }

  public get balanceSync(): BalanceSync {
    return this.#localchain.balanceSync;
  }

  public get transactions(): Transactions {
    return this.#localchain.transactions;
  }

  public get mainchainTransfers(): MainchainTransferStore {
    return this.#localchain.mainchainTransfers;
  }

  public get inner(): Localchain {
    return this.#localchain;
  }

  #localchain!: Localchain;
  public datastoreLookup!: DatastoreLookup;
  public address!: Promise<string>;
  public enableLogging = true;

  private nextTick: NodeJS.Timeout;

  constructor(readonly localchainConfig: ILocalchainConfig = {}) {
    super();
  }

  public async load(): Promise<void> {
    const { mainchainUrl, localchainPath } = this.localchainConfig;

    let defaultPath = localchainPath ?? Localchain.getDefaultPath();
    if (!defaultPath.endsWith('.db')) {
      defaultPath = Path.join(defaultPath, 'primary.db');
    }

    log.info(`Loading ${mainchainUrl ? 'online' : 'offline'} localchain`, {
      localchainPath: defaultPath,
    } as any);
    const keystorePassword = this.getPassword();

    if (mainchainUrl) {
      this.#localchain = await Localchain.load({
        path: localchainPath,
        mainchainUrl,
        keystorePassword,
      });
      this.datastoreLookup = new DatastoreLookup(await this.#localchain.mainchainClient);
    } else {
      this.#localchain = await Localchain.loadWithoutMainchain(
        defaultPath,
        {
          genesisUtcTime: Env.genesisUtcTime,
          tickDurationMillis: Env.tickDurationMillis,
          ntpPoolUrl: Env.ntpPoolUrl,
          channelHoldExpirationTicks: Env.channelHoldExpirationTicks,
        },
        keystorePassword,
      );
    }
    this.afterLoad();
  }

  public async close(): Promise<void> {
    clearTimeout(this.nextTick);
    this.datastoreLookup = null;
    await this.#localchain?.close();
    this.#localchain = null;
  }

  public async connectToMainchain(argonMainchainUrl: string, timeoutMs = 10e3): Promise<void> {
    const mainchain = await MainchainClient.connect(argonMainchainUrl, timeoutMs);
    await this.#localchain.attachMainchain(mainchain);
  }

  public async getAccountOverview(): Promise<LocalchainOverview> {
    return await this.#localchain.accountOverview();
  }

  public timeForTick(tick: number): Date {
    return new Date(Number(this.#localchain.ticker.timeForTick(tick)));
  }

  public async createPaymentService(
    datastoreClients: DatastoreApiClients,
  ): Promise<DefaultPaymentService> {
    return await DefaultPaymentService.fromLocalchain(
      this,
      this.localchainConfig.channelHoldAllocationStrategy,
      datastoreClients,
    );
  }

  private getPassword(): KeystorePasswordOption | undefined {
    let keystorePassword = this.localchainConfig.keystorePassword;
    if (
      keystorePassword &&
      !keystorePassword.password &&
      !keystorePassword.passwordFile &&
      !keystorePassword.interactiveCli
    ) {
      keystorePassword = undefined;
    }
    return keystorePassword;
  }

  private afterLoad(): void {
    const { keystorePassword } = this.localchainConfig;
    this.address = this.#localchain.address.catch(() => null);
    // remove password from memory
    if (Buffer.isBuffer(keystorePassword?.password)) {
      keystorePassword.password.fill(0);
      delete keystorePassword.password;
    }
    if (this.localchainConfig.automaticallyRunSync !== false) this.scheduleNextTick();
  }

  private scheduleNextTick(): void {
    clearTimeout(this.nextTick);
    this.nextTick = setTimeout(async () => {
      try {
        const result = await this.#localchain.balanceSync.sync({
          votesAddress: this.localchainConfig.blockRewardsAddress,
        });
        this.emit('sync', result);
        if (this.enableLogging) {
          log.info('ChannelHold Manager Sync result', {
            // have to weirdly jsonify
            balanceChanges: await Promise.all(result.balanceChanges.map(gettersToObject)),
            notarizations: await Promise.all(result.channelHoldNotarizations.map(gettersToObject)),
          } as any);
        }
      } catch (error) {
        log.error('Error synching channelHold balance changes', { error });
      }
    }, Number(this.#localchain.ticker.millisToNextTick()));
  }

  public static async load(config?: ILocalchainConfig): Promise<LocalchainWithSync> {
    const localchain = new LocalchainWithSync(config);
    await localchain.load();
    return localchain;
  }
}
