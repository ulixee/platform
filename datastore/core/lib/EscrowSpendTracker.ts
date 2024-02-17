import Logger from '@ulixee/commons/lib/Logger';
import { DataDomainStore, Escrow, OpenEscrow } from '@ulixee/localchain';
import IEscrowServiceApiTypes from '@ulixee/platform-specification/services/EscrowServiceApis';
import IBalanceChange from '@ulixee/platform-specification/types/IBalanceChange';
import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import DatastoreEscrowsDb from '../db/DatastoreEscrowsDb';
import IEscrowSpendTracker from '../interfaces/IEscrowSpendTracker';
import LocalchainWithSync from './LocalchainWithSync';

const { log } = Logger(module);

export default class EscrowSpendTracker implements IEscrowSpendTracker {
  private readonly escrowDbsByDatastore = new Map<string, DatastoreEscrowsDb>();

  private readonly openEscrowsById = new Map<string, OpenEscrow>();

  constructor(
    readonly escrowDbDir: string,
    readonly localchain: LocalchainWithSync,
  ) {}

  public async close(): Promise<void> {
    return Promise.resolve();
  }

  public async debit(
    data: IEscrowServiceApiTypes['EscrowService.debitPayment']['args'],
  ): Promise<IEscrowServiceApiTypes['EscrowService.debitPayment']['result']> {
    if (!data.payment.escrow.id) {
      throw new Error(
        'The payment sent to the escrow spend tracker does not have an escrow id. This is an internal error.',
      );
    }

    await this.updateSettlement(
      data.payment.escrow.id,
      data.payment.escrow.settledMilligons,
      data.payment.escrow.settledSignature,
    );
    return this.getDb(data.datastoreId).debit(data.queryId, data.payment);
  }

  public finalize(
    data: IEscrowServiceApiTypes['EscrowService.finalizePayment']['args'],
  ): Promise<IEscrowServiceApiTypes['EscrowService.finalizePayment']['result']> {
    const { datastoreId, escrowId, uuid, finalMicrogons } = data;
    this.getDb(datastoreId).finalize(escrowId, uuid, finalMicrogons);
    return Promise.resolve();
  }

  public async importEscrow(
    data: IEscrowServiceApiTypes['EscrowService.importEscrow']['args'],
    datastoreManifest: IDatastoreManifest,
  ): Promise<IEscrowServiceApiTypes['EscrowService.importEscrow']['result']> {
    const note = data.escrow.escrowHoldNote;
    if (note.noteType.action === 'escrowHold') {
      if (datastoreManifest.domain) {
        const notaryHash = DataDomainStore.getHash(datastoreManifest.domain);
        if (!note.noteType.dataDomainHash.equals(notaryHash)) {
          throw new Error(
            `The supplied Escrow note does not match the data domain of this Datastore ${data.datastoreId}`,
          );
        }
      }
      if (datastoreManifest.payment.notaryId !== data.escrow.previousBalanceProof?.notaryId) {
        throw new Error(
          `The escrow notary (${data.escrow.previousBalanceProof?.notaryId}) does not match the required notary (${datastoreManifest.payment.notaryId})`,
        );
      }

      const recipient = note.noteType.recipient;

      if (datastoreManifest.payment.address !== recipient) {
        throw new Error(
          `The escrow account (${data.escrow.accountId}) does not match the required account (${recipient})`,
        );
      }
      if (!this.canSign(recipient)) {
        log.warn('Escrow recipient is not in the keystore of this node', {
          recipient,
          escrow: data.escrow,
        } as any);
        throw new Error('Escrow recipient is not in the keystore of this node');
      }
    } else {
      throw new Error('Invalid escrow note');
    }

    const escrow = await this.importToLocalchain(data.datastoreId, data.escrow);
    this.getDb(data.datastoreId).create(
      escrow.id,
      Number(escrow.holdAmount),
      this.timeForTick(escrow.expirationTick),
    );

    return { accepted: true };
  }

  private async updateSettlement(
    escrowId: string,
    settledMilligons: bigint,
    settledSignature: Buffer,
  ): Promise<void> {
    let escrow = this.openEscrowsById.get(escrowId);
    if (!escrow) {
      escrow = await this.localchain.openEscrows.get(escrowId);
      this.openEscrowsById.set(escrowId, escrow);
    }
    const internal = await escrow.escrow;
    if (settledMilligons > internal.settledAmount) {
      await escrow.recordUpdatedSettlement(settledMilligons, settledSignature);
    }
  }

  private timeForTick(tick: number): Date {
    return this.localchain.timeForTick(tick);
  }

  private async importToLocalchain(
    datastoreId: string,
    balanceChange: IBalanceChange,
  ): Promise<Escrow> {
    log.stats('Importing escrow to localchain', { datastoreId, balanceChange } as any);
    const escrowJson = JSON.stringify(balanceChange, (name: string, value: unknown) => {
      if (Buffer.isBuffer(value)) {
        return `0x${value.toString('hex')}`;
      }
      if (
        value &&
        typeof value === 'object' &&
        'type' in value &&
        'data' in value &&
        value.type === 'Buffer'
      ) {
        return `0x${Buffer.from(value.data as any).toString('hex')}`;
      }
      if (typeof value === 'bigint') {
        if (value > Number.MAX_SAFE_INTEGER) {
          return value.toString();
        }
        return Number(value);
      }
      return value;
    });

    const openEscrow = await this.localchain.openEscrows.importEscrow(escrowJson);
    const escrow = await openEscrow.escrow;

    this.openEscrowsById.set(escrow.id, openEscrow);
    return escrow;
  }

  private canSign(address: string): boolean {
    return this.localchain.signer.canSign(address);
  }

  private getDb(datastoreId: string): DatastoreEscrowsDb {
    if (!datastoreId) throw new Error('No datastoreId provided to get escrow spend tracking db.');
    let db = this.escrowDbsByDatastore.get(datastoreId);
    if (!db) {
      db = new DatastoreEscrowsDb(this.escrowDbDir, datastoreId);
      this.escrowDbsByDatastore.set(datastoreId, db);
    }
    return db;
  }
}
