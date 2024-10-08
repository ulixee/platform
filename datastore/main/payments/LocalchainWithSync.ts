import {
  AccountStore,
  BalanceSync,
  BalanceSyncResult,
  CryptoScheme,
  DomainStore,
  Keystore,
  KeystorePasswordOption,
  Localchain,
  LocalchainOverview,
  MainchainClient,
  MainchainTransferStore,
  OpenChannelHoldsStore,
  TickerRef,
  Transactions,
} from '@argonprotocol/localchain';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import Logger from '@ulixee/commons/lib/Logger';
import Resolvable from '@ulixee/commons/lib/Resolvable';
import { IDatastorePaymentRecipient } from '@ulixee/platform-specification/types/IDatastoreManifest';
import { proxyWrapper } from '@ulixee/platform-utils/lib/nativeUtils';
import { gettersToObject } from '@ulixee/platform-utils/lib/objectUtils';
import * as Path from 'node:path';
import Env from '../env';
import ILocalchainConfig from '../interfaces/ILocalchainConfig';
import ILocalchainRef from '../interfaces/ILocalchainRef';
import DatastoreApiClients from '../lib/DatastoreApiClients';
import DatastoreLookup from '../lib/DatastoreLookup';
import DefaultPaymentService from './DefaultPaymentService';

const { log } = Logger(module);

export default class LocalchainWithSync
  extends TypedEventEmitter<{ sync: BalanceSyncResult }>
  implements ILocalchainRef
{
  public get accounts(): AccountStore {
    return this.#localchain.accounts;
  }

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

  public get ticker(): TickerRef {
    return this.#localchain.ticker;
  }

  public get mainchainTransfers(): MainchainTransferStore {
    return this.#localchain.mainchainTransfers;
  }

  public get mainchainClient(): Promise<MainchainClient> {
    return this.#localchain.mainchainClient;
  }

  public get keystore(): Keystore {
    return this.#localchain.keystore;
  }

  public get inner(): Localchain {
    return this.#localchain;
  }

  public get name(): string {
    return this.#localchain.name;
  }

  public get path(): string {
    return this.#localchain.path;
  }

  public get currentTick(): number {
    return this.#localchain.currentTick;
  }

  #localchain!: Localchain;
  public isSynching: boolean;
  public datastoreLookup!: DatastoreLookup;
  public address!: Promise<string>;
  public enableLogging = true;
  public paymentInfo = new Resolvable<IDatastorePaymentRecipient>();
  public mainchainLoaded = new Resolvable<void>();

  private nextTick: NodeJS.Timeout;

  constructor(readonly localchainConfig: ILocalchainConfig = {}) {
    super();
    this.localchainConfig.mainchainUrl ||= Env.argonMainchainUrl;
    if (this.localchainConfig.localchainName && !this.localchainConfig.localchainPath) {
      let dbName = this.localchainConfig.localchainName;
      if (!dbName.endsWith('.db')) {
        dbName += '.db';
      }
      this.localchainConfig.localchainPath = Path.join(Localchain.getDefaultDir(), dbName);
    }
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
    // We wrap this (as of 10/2024) because nodejs doesn't handle async stack traces, so code
    // appears to die in the middle of nowhere
    this.#localchain = proxyWrapper(this.#localchain);

    if (mainchainUrl) {
      void this.connectToMainchain(mainchainUrl)
        .then(async () => {
          this.datastoreLookup = new DatastoreLookup(this.#localchain.mainchainClient);
          return null;
        })
        .catch(error => {
          log.error('Error connecting to mainchain', { error });
        });
    }
    this.afterLoad();
  }

  public async isCreated(): Promise<boolean> {
    const accounts = await this.#localchain.accounts.list();
    return accounts.length > 0;
  }

  public async create(account?: { suri?: string; cryptoScheme?: CryptoScheme }): Promise<void> {
    log.info('Creating localchain', { path: Localchain.getDefaultPath() } as any);
    if (account?.suri) {
      const keystorePassword = this.getPassword();
      await this.#localchain.keystore.importSuri(
        account.suri,
        account.cryptoScheme ?? CryptoScheme.Sr25519,
        keystorePassword,
      );
    } else {
      await this.#localchain.keystore.bootstrap();
    }
  }

  public async close(): Promise<void> {
    clearTimeout(this.nextTick);
    this.datastoreLookup = null;
    await this.#localchain?.close();
    await this.#localchain?.mainchainClient.then(x => x?.close());
    this.#localchain = null;
  }

  public async connectToMainchain(argonMainchainUrl: string, timeoutMs = 10e3): Promise<void> {
    try {
      const mainchain = await MainchainClient.connect(argonMainchainUrl, timeoutMs);
      await this.attachMainchain(mainchain);
    } catch (error) {
      this.mainchainLoaded.reject(error);
      log.error('Error connecting to mainchain', { error });
    }
  }

  public async attachMainchain(mainchain: MainchainClient): Promise<void> {
    await this.#localchain.attachMainchain(mainchain);
    await this.#localchain.updateTicker();
    this.mainchainLoaded.resolve();
  }

  public async accountOverview(): Promise<LocalchainOverview> {
    return await this.#localchain.accountOverview();
  }

  public timeForTick(tick: number): Date {
    return new Date(Number(this.#localchain.ticker.timeForTick(tick)));
  }

  public async createPaymentService(
    datastoreClients: DatastoreApiClients,
  ): Promise<DefaultPaymentService> {
    return await DefaultPaymentService.fromOpenLocalchain(
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
    const { keystorePassword, notaryId } = this.localchainConfig;
    this.address = this.#localchain.address.catch(() => null);
    // remove password from memory
    if (Buffer.isBuffer(keystorePassword?.password)) {
      keystorePassword.password.fill(0);
      delete keystorePassword.password;
    }
    void this.accountOverview()
      // eslint-disable-next-line promise/always-return
      .then(x => {
        this.paymentInfo.resolve({
          address: x.address,
          ...x.mainchainIdentity,
          notaryId,
        });
      })
      .catch(this.paymentInfo.reject);

    this.scheduleNextTick();
  }

  private scheduleNextTick(): void {
    clearTimeout(this.nextTick);
    if (this.localchainConfig.disableAutomaticSync === true) {
      return;
    }
    let millisToNextTick = Number(this.#localchain.ticker.millisToNextTick());
    if (Number.isNaN(millisToNextTick)) {
      millisToNextTick = 1000;
    }
    this.nextTick = setTimeout(async () => {
      try {
        this.isSynching = true;
        const result = await this.#localchain.balanceSync.sync({
          votesAddress: this.localchainConfig.blockRewardsAddress,
        });
        this.emit('sync', result);
        if (this.enableLogging) {
          log.info('Localchain Sync result', {
            // have to weirdly jsonify
            balanceChanges: await Promise.all(result.balanceChanges.map(gettersToObject)),
            channelHoldNotarizations: await Promise.all(result.channelHoldNotarizations.map(gettersToObject)),
            mainchainTransfers: await Promise.all(result.mainchainTransfers.map(gettersToObject)),
            channelHoldsUpdated: await Promise.all(result.channelHoldsUpdated.map(gettersToObject)),
            blockVotes: await Promise.all(result.blockVotes.map(gettersToObject)),
          } as any);
        }
      } catch (error) {
        log.error('Error synching channelHold balance changes', { error });
      } finally {
        this.isSynching = false;
        this.scheduleNextTick();
      }
    }, millisToNextTick);
  }

  public static async load(config?: ILocalchainConfig): Promise<LocalchainWithSync> {
    const localchain = new LocalchainWithSync(config);
    await localchain.load();
    return localchain;
  }
}
