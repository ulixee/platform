import { ChannelHold, DomainStore, OpenChannelHold } from '@argonprotocol/localchain';
import Logger from '@ulixee/commons/lib/Logger';
import { LocalchainWithSync } from '@ulixee/datastore';
import IArgonPaymentProcessor from '@ulixee/datastore-core/interfaces/IArgonPaymentProcessor';
import ILocalchainRef from '@ulixee/datastore/interfaces/ILocalchainRef';
import { IArgonPaymentProcessorApiTypes } from '@ulixee/platform-specification/services/ArgonPaymentProcessorApis';
import IBalanceChange from '@ulixee/platform-specification/types/IBalanceChange';
import IDatastoreManifest, {
  IDatastorePaymentRecipient,
} from '@ulixee/platform-specification/types/IDatastoreManifest';
import serdeJson from '@ulixee/platform-utils/lib/serdeJson';
import DatastoreChannelHoldsDb from '../db/DatastoreChannelHoldsDb';

const { log } = Logger(module);

export default class ArgonPaymentProcessor implements IArgonPaymentProcessor {
  private readonly channelHoldDbsByDatastore = new Map<string, DatastoreChannelHoldsDb>();

  private readonly openChannelHoldsById = new Map<string, OpenChannelHold>();

  private cachedPaymentInfo?: IDatastorePaymentRecipient;

  constructor(
    readonly channelHoldDbDir: string,
    readonly localchain: ILocalchainRef,
  ) {}

  public async getPaymentInfo(): Promise<IDatastorePaymentRecipient | undefined> {
    if (!this.cachedPaymentInfo) {
      this.cachedPaymentInfo = await (this.localchain as LocalchainWithSync).paymentInfo?.promise;
    }
    if (!this.cachedPaymentInfo) {
      const account = await this.localchain.accountOverview();
      const notaryId = (await this.localchain.accounts.getDepositAccount()).notaryId;
      this.cachedPaymentInfo = {
        address: account.address,
        notaryId,
        ...account.mainchainIdentity,
      };
    }
    return this.cachedPaymentInfo;
  }

  public async close(): Promise<void> {
    return Promise.resolve();
  }

  public async debit(
    data: IArgonPaymentProcessorApiTypes['ArgonPaymentProcessor.debit']['args'],
  ): Promise<IArgonPaymentProcessorApiTypes['ArgonPaymentProcessor.debit']['result']> {
    if (!data.payment.channelHold.id) {
      throw new Error(
        'The payment sent to the ArgonPaymentProcessor does not have a ChannelHold id. This is an internal error.',
      );
    }

    await this.updateSettlement(
      data.payment.channelHold.id,
      data.payment.channelHold.settledMicrogons,
      data.payment.channelHold.settledSignature,
    );
    return this.getDb(data.datastoreId).debit(data.queryId, data.payment);
  }

  public finalize(
    data: IArgonPaymentProcessorApiTypes['ArgonPaymentProcessor.finalize']['args'],
  ): Promise<IArgonPaymentProcessorApiTypes['ArgonPaymentProcessor.finalize']['result']> {
    const { datastoreId, channelHoldId, uuid, finalMicrogons } = data;
    this.getDb(datastoreId).finalize(channelHoldId, uuid, finalMicrogons);
    return Promise.resolve();
  }

  public async importChannelHold(
    data: IArgonPaymentProcessorApiTypes['ArgonPaymentProcessor.importChannelHold']['args'],
    datastoreManifest: IDatastoreManifest,
  ): Promise<IArgonPaymentProcessorApiTypes['ArgonPaymentProcessor.importChannelHold']['result']> {
    const note = data.channelHold.channelHoldNote;
    if (note.noteType.action === 'channelHold') {
      if (datastoreManifest.domain) {
        const notaryHash = DomainStore.getHash(datastoreManifest.domain);
        if (!note.noteType.domainHash.equals(notaryHash)) {
          throw new Error(
            `The supplied ChannelHold note does not match the domain of this Datastore ${data.datastoreId}`,
          );
        }
      }

      const paymentInfo = await this.getPaymentInfo();

      if (
        paymentInfo.notaryId &&
        paymentInfo.notaryId !== data.channelHold.previousBalanceProof?.notaryId
      ) {
        throw new Error(
          `The channelHold notary (${data.channelHold.previousBalanceProof?.notaryId}) does not match the required notary (${paymentInfo.notaryId})`,
        );
      }

      const recipient = note.noteType.recipient;
      if ((await this.canSign(recipient)) !== true) {
        const localchainAddress = await this.localchain.address;

        log.warn(
          'This channelHold is made out to a different address than your attached localchain',
          {
            recipient,
            channelHold: data.channelHold,
            yourAddress: localchainAddress,
          } as any,
        );
        throw new Error('ChannelHold recipient not localchain address');
      }
    } else {
      throw new Error('Invalid channelHold note');
    }

    const channelHold = await this.importToLocalchain(data.datastoreId, data.channelHold);
    this.getDb(data.datastoreId).create(
      channelHold.id,
      channelHold.holdAmount,
      this.timeForTick(channelHold.expirationTick),
    );

    return { accepted: true };
  }

  private async updateSettlement(
    channelHoldId: string,
    settledMicrogons: bigint,
    settledSignature: Buffer,
  ): Promise<void> {
    let channelHold = this.openChannelHoldsById.get(channelHoldId);
    if (!channelHold) {
      channelHold = await this.localchain.openChannelHolds.get(channelHoldId);
      this.openChannelHoldsById.set(channelHoldId, channelHold);
    }
    const internal = await channelHold.channelHold;
    if (settledMicrogons > internal.settledAmount) {
      await channelHold.recordUpdatedSettlement(settledMicrogons, settledSignature);
    }
  }

  private async canSign(address: string): Promise<boolean> {
    const myAddress = await this.localchain.address;
    return myAddress === address;
  }

  private timeForTick(tick: number): Date {
    const time = this.localchain.ticker.timeForTick(tick);
    return new Date(Number(time));
  }

  private async importToLocalchain(
    datastoreId: string,
    balanceChange: IBalanceChange,
  ): Promise<ChannelHold> {
    log.stats('Importing channelHold to localchain', { datastoreId, balanceChange } as any);
    const channelHoldJson = serdeJson(balanceChange);

    const openChannelHold =
      await this.localchain.openChannelHolds.importChannelHold(channelHoldJson);
    const channelHold = await openChannelHold.channelHold;

    this.openChannelHoldsById.set(channelHold.id, openChannelHold);
    return channelHold;
  }

  private getDb(datastoreId: string): DatastoreChannelHoldsDb {
    if (!datastoreId)
      throw new Error('No datastoreId provided to get channelHold spend tracking db.');
    let db = this.channelHoldDbsByDatastore.get(datastoreId);
    if (!db) {
      db = new DatastoreChannelHoldsDb(this.channelHoldDbDir, datastoreId);
      this.channelHoldDbsByDatastore.set(datastoreId, db);
    }
    return db;
  }
}
