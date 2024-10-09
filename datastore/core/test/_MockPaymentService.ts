import { KeyringPair } from '@argonprotocol/mainchain';
import { encodeBuffer } from '@ulixee/commons/lib/bufferUtils';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import { sha256 } from '@ulixee/commons/lib/hashUtils';
import IPaymentService, { IPaymentEvents } from '@ulixee/datastore/interfaces/IPaymentService';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import { IPayment } from '@ulixee/platform-specification';
import IPaymentServiceApiTypes from '@ulixee/platform-specification/datastore/PaymentServiceApis';
import { AccountType } from '@ulixee/platform-specification/types/IBalanceChange';
import { IDatastorePaymentRecipient } from '@ulixee/platform-specification/types/IDatastoreManifest';
import { nanoid } from 'nanoid';

export default class MockPaymentService
  extends TypedEventEmitter<IPaymentEvents>
  implements IPaymentService
{
  public paymentsByDatastoreId: {
    [datastoreId: string]: {
      channelHoldId: string;
    };
  } = {};

  public channelHoldsById: {
    [channelHoldId: string]: {
      channelHoldAmount: bigint;
      tick: number;
    };
  } = {};

  public payments: IPaymentServiceApiTypes['PaymentService.finalize']['args'][] = [];

  constructor(
    public clientAddress: KeyringPair,
    public client: DatastoreApiClient,
    public paymentInfo?: IDatastorePaymentRecipient,
    private name?: string,
  ) {
    super();
  }

  async close(): Promise<void> {
    return null;
  }

  async getPaymentInfo(): Promise<IDatastorePaymentRecipient> {
    return this.paymentInfo;
  }

  async reserve(
    info: IPaymentServiceApiTypes['PaymentService.reserve']['args'],
  ): Promise<IPayment> {
    const paymentId = nanoid();

    let channelHoldId = this.paymentsByDatastoreId[info.id]?.channelHoldId;
    if (!channelHoldId) {
      channelHoldId = encodeBuffer(sha256(nanoid()), 'chan');
      this.paymentsByDatastoreId[info.id] = {
        channelHoldId,
      };
      const milligons = BigInt(Math.min(5, Math.ceil((info.microgons * 100) / 1000)));
      this.channelHoldsById[channelHoldId] = { channelHoldAmount: milligons, tick: 1 };
      await this.client.registerChannelHold(info.id, {
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
        channelHoldNote: {
          noteType: { action: 'channelHold', recipient: info.recipient.address },
          milligons,
        },
        notes: [{ milligons: 5n, noteType: { action: 'channelHoldSettle' } }],
        changeNumber: 2,
        signature: Buffer.from(this.clientAddress.sign('siggy', { withType: true })),
      });
    }

    return {
      channelHold: {
        id: channelHoldId,
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
