import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';
import Logger from '@ulixee/commons/lib/Logger';
import IDatastoreHostLookup from '@ulixee/datastore/interfaces/IDatastoreHostLookup';
import { IWallet } from '@ulixee/datastore/interfaces/IPaymentService';
import DatastoreLookup from '@ulixee/datastore/lib/DatastoreLookup';
import LocalUserProfile from '@ulixee/datastore/lib/LocalUserProfile';
import LocalchainPaymentService from '@ulixee/datastore/payments/LocalchainPaymentService';
import { IArgonFileMeta } from '@ulixee/desktop-interfaces/apis';
import { CryptoScheme, Localchain, LocalchainOverview, MainchainClient } from '@ulixee/localchain';
import { ArgonFileSchema } from '@ulixee/platform-specification/types/IArgonFile';
import ArgonUtils from '@ulixee/platform-utils/lib/ArgonUtils';
import { gettersToObject } from '@ulixee/platform-utils/lib/objectUtils';
import serdeJson from '@ulixee/platform-utils/lib/serdeJson';
import * as Path from 'path';
import { IArgonFile } from './ArgonFile';

const { log } = Logger(module);

export default class AccountManager {
  exited = false;
  events = new EventSubscriber();
  public localchains: Localchain[] = [];
  private localchainAddresses = new Map<Localchain, string>();

  constructor(readonly localUserProfile: LocalUserProfile) {}

  public async start(): Promise<void> {
    if (!this.localUserProfile.localchainPaths.length) {
      await this.addAccount();
    } else {
      this.localchains = await Promise.all(
        this.localUserProfile.localchainPaths.map(path =>
          LocalchainPaymentService.loadLocalchain({ localchainPath: path }),
        ),
      );
    }
  }

  public async close(): Promise<void> {
    if (this.exited) return;
    this.exited = true;
  }

  public async addAccount(
    config: { path?: string; password?: string; cryptoScheme?: CryptoScheme; suri?: string } = {},
  ): Promise<Localchain> {
    config ??= {};
    const localchain = await LocalchainPaymentService.loadLocalchain({
      localchainPath: config.path,
      keystorePassword: {
        password: config.password ? Buffer.from(config.password) : undefined,
      },
    });
    this.localchains.push(localchain);

    if (!this.localUserProfile.localchainPaths.includes(localchain.path)) {
      this.localUserProfile.localchainPaths.push(localchain.path);
      await this.localUserProfile.save();
    }
    if (!(await localchain.accounts.list()).length) {
      if (config.suri) {
        await localchain.keystore.importSuri(
          config.suri,
          config.cryptoScheme ?? CryptoScheme.Sr25519,
          {
            password: config.password ? Buffer.from(config.password) : undefined,
          },
        );
      } else {
        await localchain.keystore.bootstrap();
      }
    }
    return localchain;
  }

  public async getAddress(localchain: Localchain): Promise<string> {
    if (!this.localchainAddresses.has(localchain)) {
      this.localchainAddresses.set(localchain, await localchain.address);
    }
    return this.localchainAddresses.get(localchain);
  }

  public async getLocalchain(address: String): Promise<Localchain> {
    if (!address) return null;
    for (const chain of this.localchains) {
      if ((await this.getAddress(chain)) === address) return chain;
    }
  }

  public async getDatastoreHostLookup(): Promise<IDatastoreHostLookup | null> {
    const mainchainClient = await this.mainchainClient();
    return new DatastoreLookup(mainchainClient);
  }

  public async mainchainClient(): Promise<MainchainClient | undefined> {
    return this.localchains.find(x => !!x.mainchainClient)?.mainchainClient;
  }

  public async getWallet(): Promise<IWallet> {
    const accounts = await Promise.all(this.localchains.map(x => x.accountOverview()));
    const balance = accounts.reduce((sum, x) => sum + x.balance + x.mainchainBalance, 0n);
    const formattedBalance = ArgonUtils.format(balance, 'milligons', 'argons');

    return {
      primaryAddress: (accounts.find(x => x.name === 'primary') ?? accounts[0]).address,
      credits: [],
      accounts,
      formattedBalance,
    };
  }

  public async transferMainchainToLocal(address: string, amount: bigint): Promise<void> {
    const localchain = await this.getLocalchain(address);
    if (!localchain) throw new Error('No localchain found for address');
    await localchain.mainchainTransfers.sendToLocalchain(amount);
  }

  public async transferLocalToMainchain(address: string, amount: bigint): Promise<void> {
    const localchain = await this.getLocalchain(address);
    if (!localchain) throw new Error('No localchain found for address');
    const change = localchain.beginChange();
    const account = await change.defaultDepositAccount();
    await account.sendToMainchain(amount);
    await change.notarize();
  }

  public async createAccount(
    name: string,
    suri?: string,
    password?: string,
  ): Promise<LocalchainOverview> {
    const path = Path.join(Localchain.getDefaultDir(), `${name}.db`);
    const localchain = await this.addAccount({ path, suri, password });
    return await localchain.accountOverview();
  }

  public async createArgonsToSendFile(request: {
    milligons: bigint;
    fromAddress?: string;
    toAddress?: string;
  }): Promise<IArgonFileMeta> {
    const localchain = (await this.getLocalchain(request.fromAddress)) ?? this.localchains[0];

    const file = await localchain.transactions.send(
      request.milligons,
      request.toAddress ? [request.toAddress] : null,
    );

    const recipient = request.toAddress ? `for ${request.toAddress}` : 'cash';
    return {
      file: ArgonFileSchema.parse(file),
      name: `${ArgonUtils.format(request.milligons, 'milligons', 'argons')} ${recipient}.arg`,
    };
  }

  public async createArgonsToRequestFile(request: {
    milligons: bigint;
    sendToMyAddress?: String;
  }): Promise<IArgonFileMeta> {
    const localchain = (await this.getLocalchain(request.sendToMyAddress)) ?? this.localchains[0];
    const file = await localchain.transactions.request(request.milligons);

    return {
      file: ArgonFileSchema.parse(file),
      name: `Argon Request ${new Date().toLocaleString()}`,
    };
  }

  public async acceptArgonRequest(
    argonFile: IArgonFile,
    fulfillFromAccount?: String,
  ): Promise<void> {
    if (!argonFile.request) {
      throw new Error('This Argon file is not a request');
    }
    let fromAddress = fulfillFromAccount;
    if (!fromAddress) {
      const funding = argonFile.request.reduce((sum, x) => {
        if (x.accountType === 'deposit') {
          for (const note of x.notes) {
            if (note.noteType.action === 'claim') sum += note.milligons;
          }
        }
        return sum;
      }, 0n);
      for (const account of this.localchains) {
        const overview = await account.accountOverview();
        if (overview.balance >= funding) {
          fromAddress = overview.address;
          break;
        }
      }
    }
    const localchain = (await this.getLocalchain(fromAddress)) ?? this.localchains[0];
    const argonFileJson = serdeJson(argonFile);
    const importChange = localchain.beginChange();
    await importChange.acceptArgonFileRequest(argonFileJson);
    const result = await importChange.notarize();
    log.info('Argon request notarized', { argonFile: gettersToObject(result) } as any);
  }

  public async importArgons(argonFile: IArgonFile): Promise<void> {
    if (!argonFile.send) {
      throw new Error('This Argon file does not contain any sent argons');
    }

    const filters = argonFile.send
      .map(x => {
        if (x.accountType === 'deposit') {
          for (const note of x.notes) {
            if (note.noteType.action === 'send') {
              return note.noteType.to;
            }
          }
        }
        return [];
      })
      .flat()
      .filter(Boolean);

    let localchain = this.localchains[0];
    for (const filter of filters) {
      const lookup = await this.getLocalchain(filter);
      if (lookup) {
        localchain = lookup;
        break;
      }
    }

    const argonFileJson = serdeJson(argonFile);
    const importChange = localchain.beginChange();
    await importChange.importArgonFile(argonFileJson);
    const result = await importChange.notarize();
    log.info('Argon import notarized', { argonFile: gettersToObject(result) } as any);
  }
}
