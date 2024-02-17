import { KeyringPair } from '@polkadot/keyring/types';
import { encodeBuffer } from '@ulixee/commons/lib/bufferUtils';
import { sha256 } from '@ulixee/commons/lib/hashUtils';
import IPaymentService from '@ulixee/datastore/interfaces/IPaymentService';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import { AccountType } from '@ulixee/localchain';
import { IPayment } from '@ulixee/platform-specification';
import IPaymentServiceApiTypes from '@ulixee/platform-specification/datastore/PaymentServiceApis';
import { nanoid } from 'nanoid';

export default class MockPaymentService implements IPaymentService {
  public paymentsByDatastoreId: {
    [datastoreId: string]: {
      escrowId: string;
    };
  } = {};

  public escrowsById: {
    [escrowId: string]: {
      escrowHoldAmount: bigint;
      tick: number;
    };
  } = {};

  public payments: IPaymentServiceApiTypes['PaymentService.finalize']['args'][] = [];

  constructor(
    public clientAddress: KeyringPair,
    public client: DatastoreApiClient,
  ) {}

  async reserve(
    info: IPaymentServiceApiTypes['PaymentService.reserve']['args'],
  ): Promise<IPayment> {
    const paymentId = nanoid();

    let escrowId = this.paymentsByDatastoreId[info.id]?.escrowId;
    if (!escrowId) {
      escrowId = encodeBuffer(sha256(nanoid()), 'esc');
      this.paymentsByDatastoreId[info.id] = {
        escrowId,
      };
      const milligons = BigInt(Math.min(5, Math.ceil((info.microgons * 100) / 1000)));
      this.escrowsById[escrowId] = { escrowHoldAmount: milligons, tick: 1 };
      await this.client.registerEscrow(info.id, {
        accountId: this.clientAddress.address,
        accountType: AccountType.Deposit,
        balance: 20_000n - milligons,
        previousBalanceProof: {
          balance: 20_000n,
          notaryId: info.recipient.notaryId,
          accountOrigin: { notebookNumber: 1, accountUid: 1 },
          notebookNumber: 1,
          notebookProof: {
            leafIndex: 0,
            numberOfLeaves: 1,
            proof: [],
          },
          tick: 1,
        },
        escrowHoldNote: {
          noteType: { action: 'escrowHold', recipient: info.recipient.address },
          milligons,
        },
        notes: [{ milligons: 5n, noteType: { action: 'escrowSettle' } }],
        changeNumber: 2,
        signature: Buffer.from(this.clientAddress.sign('siggy', { withType: true })),
      });
    }

    return {
      escrow: {
        id: escrowId,
        settledMilligons: 5n,
        settledSignature: Buffer.from(this.clientAddress.sign('siggy', { withType: true })),
      },
      microgons: info.microgons,
      uuid: paymentId,
    };
  }

  async finalize(info): Promise<void> {
    this.payments.push(info);
  }
}
