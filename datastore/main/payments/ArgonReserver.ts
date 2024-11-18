import { CHANNEL_HOLD_MINIMUM_SETTLEMENT } from '@argonprotocol/localchain';
import { getDataDirectory } from '@ulixee/commons/lib/dirUtils';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import { readFileAsJson, safeOverwriteFile } from '@ulixee/commons/lib/fileUtils';
import Logger from '@ulixee/commons/lib/Logger';
import Queue from '@ulixee/commons/lib/Queue';
import TypeSerializer from '@ulixee/commons/lib/TypeSerializer';
import { toUrl } from '@ulixee/commons/lib/utils';
import { IPayment } from '@ulixee/platform-specification';
import IPaymentServiceApiTypes from '@ulixee/platform-specification/datastore/PaymentServiceApis';
import IBalanceChange from '@ulixee/platform-specification/types/IBalanceChange';
import { IPaymentMethod } from '@ulixee/platform-specification/types/IPayment';
import { nanoid } from 'nanoid';
import * as Path from 'node:path';
import { IPaymentDetails, IPaymentEvents, IPaymentReserver } from '../interfaces/IPaymentService';
import DatastoreApiClients from '../lib/DatastoreApiClients';

const { log } = Logger(module);

export type IChannelHoldAllocationStrategy =
  | { type: 'default'; microgons: bigint }
  | { type: 'multiplier'; queries: number };

type IPaymentDetailsByDatastoreId = { [datastoreId: string]: IPaymentDetails[] };

export interface IChannelHoldDetails {
  channelHoldId: string;
  balanceChange: IBalanceChange;
  expirationDate: Date;
}

export interface IChannelHoldSource {
  sourceKey: string;
  createChannelHold(
    paymentInfo: IPaymentServiceApiTypes['PaymentService.reserve']['args'],
    microgons: bigint,
  ): Promise<IChannelHoldDetails>;
  updateChannelHoldSettlement(
    channelHold: IPaymentMethod['channelHold'],
    updatedSettlement: bigint,
  ): Promise<void>;
}

export default class ArgonReserver
  extends TypedEventEmitter<IPaymentEvents>
  implements IPaymentReserver
{
  public static settlementThreshold = 1000n;
  public static baseStorePath = Path.join(getDataDirectory(), `ulixee`);
  public readonly paymentsByDatastoreId: IPaymentDetailsByDatastoreId = {};

  private paymentsPendingFinalization: {
    [uuid: string]: { microgons: bigint; datastoreId: string; paymentId: string };
  } = {};

  private readonly reserveQueueByDatastoreId: { [url: string]: Queue } = {};
  private readonly channelHoldQueue = new Queue('CHANNELHOLD QUEUE', 1);
  private needsSave = false;
  private loadPromise: Promise<any>;
  private readonly saveInterval: NodeJS.Timeout;
  private closeApiClients = false;
  private apiClients: DatastoreApiClients;

  private readonly storePath: string;

  constructor(
    private channelHoldSource: IChannelHoldSource,
    private channelHoldAllocationStrategy: IChannelHoldAllocationStrategy = {
      type: 'multiplier',
      queries: 100,
    },
    apiClients?: DatastoreApiClients,
  ) {
    super();
    this.storePath = Path.join(ArgonReserver.baseStorePath, `${channelHoldSource.sourceKey}.json`);
    this.saveInterval = setInterval(() => this.save(), 5e3).unref();
    if (!apiClients) {
      this.apiClients = new DatastoreApiClients();
      this.closeApiClients = true;
    } else {
      this.apiClients = apiClients;
    }
  }

  public async close(): Promise<void> {
    clearInterval(this.saveInterval);
    await this.save();
    if (this.closeApiClients) {
      await this.apiClients.close();
    }
  }

  public async load(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = (async () => {
      const paymentsByDatastore = await readFileAsJson<IPaymentDetailsByDatastoreId>(
        this.storePath,
      ).catch(() => ({}));
      Object.assign(this.paymentsByDatastoreId, paymentsByDatastore);
    })();
  }

  public async save(): Promise<void> {
    if (!this.needsSave || !this.loadPromise) return;
    this.needsSave = false;
    await this.loadPromise;
    await this.writeToDisk().catch(error => {
      log.error("Error saving ChannelHoldFundsTracker's payments", { error });
    });
  }

  public async reserve(
    paymentInfo: IPaymentServiceApiTypes['PaymentService.reserve']['args'],
  ): Promise<IPayment> {
    const microgons = paymentInfo.microgons ?? 0n;
    if (!microgons || !paymentInfo.recipient) return null;
    let datastoreHost = paymentInfo.host;
    const datastoreId = paymentInfo.id;
    datastoreHost = toUrl(datastoreHost).host;
    await this.load();
    this.reserveQueueByDatastoreId[datastoreId] ??= new Queue('RESERVE QUEUE', 1);
    this.paymentsByDatastoreId[datastoreId] ??= [];

    return await this.reserveQueueByDatastoreId[datastoreId].run(async () => {
      this.paymentsByDatastoreId[datastoreId] = this.paymentsByDatastoreId[datastoreId].filter(
        x => x.remaining > 0 && (!x.expirationDate || x.expirationDate > new Date()),
      );

      for (const paymentOption of this.paymentsByDatastoreId[datastoreId]) {
        if (paymentOption.remaining >= microgons) {
          if (paymentOption.paymentMethod.channelHold?.id) {
            if (
              paymentOption.host !== datastoreHost &&
              !paymentOption.host.includes(`//${datastoreHost}`)
            )
              continue;
          }
          return await this.charge(paymentOption, microgons);
        }
      }

      const holdAmount = this.calculateChannelHoldAmount(datastoreId, microgons);
      const details = await this.createChannelHold(paymentInfo, holdAmount);
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
          x.paymentMethod.channelHold?.id === payment.paymentId,
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

  public async createChannelHold(
    paymentInfo: IPaymentServiceApiTypes['PaymentService.reserve']['args'],
    microgons: bigint,
  ): Promise<IPaymentDetails> {
    const { id, host, version } = paymentInfo;
    if (microgons < CHANNEL_HOLD_MINIMUM_SETTLEMENT) {
      microgons = CHANNEL_HOLD_MINIMUM_SETTLEMENT;
    }

    return await this.channelHoldQueue.run(async () => {
      const channelHold = await this.channelHoldSource.createChannelHold(paymentInfo, microgons);

      const apiClient = this.apiClients.get(host);
      await apiClient.registerChannelHold(id, channelHold.balanceChange);
      const holdAmount = channelHold.balanceChange.channelHoldNote.microgons;
      const settlement = channelHold.balanceChange.notes[0];
      if (settlement.noteType.action !== 'channelHoldSettle') {
        throw new Error('Invalid channelHold balance change');
      }

      const channelHoldId = channelHold.channelHoldId;
      const allocated = holdAmount;
      const entry: IPaymentDetails = {
        paymentMethod: {
          channelHold: {
            id: channelHoldId,
            settledSignature: Buffer.from(channelHold.balanceChange.signature),
            settledMicrogons: settlement.microgons,
          },
        },
        id,
        version,
        remaining: allocated,
        expirationDate: channelHold.expirationDate,
        host,
        allocated,
      };
      this.emit('createdChannelHold', {
        channelHoldId,
        datastoreId: id,
        allocatedMicrogons: holdAmount,
      });
      this.paymentsByDatastoreId[id] ??= [];
      this.paymentsByDatastoreId[id].push(entry);
      return entry;
    });
  }

  protected calculateChannelHoldAmount(_datastoreId: string, microgons: bigint): bigint {
    if (this.channelHoldAllocationStrategy.type === 'default') {
      return this.channelHoldAllocationStrategy.microgons;
    }
    if (this.channelHoldAllocationStrategy.type === 'multiplier') {
      return microgons * BigInt(this.channelHoldAllocationStrategy.queries);
    }
    throw new Error(
      'Unknown channelHold allocation strategy. Please specify in `config.channelHoldAllocationStrategy.type`.',
    );
  }

  private async charge(details: IPaymentDetails, microgons: bigint): Promise<IPayment> {
    if (details.paymentMethod.channelHold?.id) {
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
      paymentId: details.paymentMethod.credits?.id ?? details.paymentMethod.channelHold?.id,
    };
    this.emit('reserved', {
      payment,
      datastoreId: details.id,
      remainingBalance: details.remaining,
    });
    return payment;
  }

  private async updateSettlement(details: IPaymentDetails, addedMicrogons: bigint): Promise<void> {
    const channelHold = details.paymentMethod.channelHold;
    if (!channelHold) return;
    // settle in increments of 1000 microgons
    const updatedSettlement =
      ((details.allocated - details.remaining + addedMicrogons + 999n) /
        ArgonReserver.settlementThreshold) *
      ArgonReserver.settlementThreshold;
    if (updatedSettlement > details.allocated) {
      throw new Error('Cannot release more than the allocated amount');
    }
    if (updatedSettlement > channelHold.settledMicrogons) {
      await this.channelHoldSource.updateChannelHoldSettlement(channelHold, updatedSettlement);
      this.needsSave = true;
      this.emit('updateSettlement', {
        channelHoldId: channelHold.id,
        settledMicrogons: channelHold.settledMicrogons,
        datastoreId: details.id,
        remaining: details.allocated - channelHold.settledMicrogons,
      });
    }
  }

  private async writeToDisk(): Promise<void> {
    await safeOverwriteFile(
      this.storePath,
      TypeSerializer.stringify(this.paymentsByDatastoreId, { format: true }),
    );
  }
}
