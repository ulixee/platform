import { getDataDirectory } from '@ulixee/commons/lib/dirUtils';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import { readFileAsJson, safeOverwriteFile } from '@ulixee/commons/lib/fileUtils';
import Logger from '@ulixee/commons/lib/Logger';
import Queue from '@ulixee/commons/lib/Queue';
import TypeSerializer from '@ulixee/commons/lib/TypeSerializer';
import { toUrl } from '@ulixee/commons/lib/utils';
import { ESCROW_MINIMUM_SETTLEMENT } from '@argonprotocol/localchain';
import { IPayment } from '@ulixee/platform-specification';
import IPaymentServiceApiTypes from '@ulixee/platform-specification/datastore/PaymentServiceApis';
import IBalanceChange from '@ulixee/platform-specification/types/IBalanceChange';
import ArgonUtils from '@ulixee/platform-utils/lib/ArgonUtils';
import { nanoid } from 'nanoid';
import * as Path from 'node:path';
import IDatastoreHostLookup from '../interfaces/IDatastoreHostLookup';
import { IPaymentDetails, IPaymentEvents, IPaymentReserver } from '../interfaces/IPaymentService';
import DatastoreApiClients from '../lib/DatastoreApiClients';

const { log } = Logger(module);

export type IEscrowAllocationStrategy =
  | { type: 'default'; milligons: bigint }
  | { type: 'multiplier'; queries: number };

type IPaymentDetailsByDatastoreId = { [datastoreId: string]: IPaymentDetails[] };

export interface IEscrowDetails {
  escrowId: string;
  balanceChange: IBalanceChange;
  expirationDate: Date;
}

export interface IEscrowSource {
  sourceKey: string;
  datastoreLookup?: IDatastoreHostLookup;
  createEscrow(
    paymentInfo: IPaymentServiceApiTypes['PaymentService.reserve']['args'],
    milligons: bigint,
  ): Promise<IEscrowDetails>;
  updateEscrowSettlement(
    escrow: IEscrowDetails,
    updatedSettlement: bigint,
  ): Promise<IBalanceChange>;
}

export default class ArgonReserver
  extends TypedEventEmitter<IPaymentEvents>
  implements IPaymentReserver
{
  public static baseStorePath = Path.join(getDataDirectory(), `ulixee`);
  public readonly paymentsByDatastoreId: IPaymentDetailsByDatastoreId = {};

  public datastoreLookup?: IDatastoreHostLookup;

  private paymentsPendingFinalization: {
    [uuid: string]: { microgons: number; datastoreId: string; paymentId: string };
  } = {};

  private readonly openEscrowsById: { [escrowId: string]: IEscrowDetails } = {};
  private readonly reserveQueueByDatastoreId: { [url: string]: Queue } = {};
  private readonly escrowQueue = new Queue('ESCROW QUEUE', 1);
  private needsSave = false;
  private loadPromise: Promise<any>;
  private readonly saveInterval: NodeJS.Timeout;
  private closeApiClients = false;
  private apiClients: DatastoreApiClients;

  private readonly storePath: string;

  constructor(
    private escrowSource: IEscrowSource,
    private escrowAllocationStrategy: IEscrowAllocationStrategy = {
      type: 'multiplier',
      queries: 100,
    },
    apiClients?: DatastoreApiClients,
  ) {
    super();
    this.storePath = Path.join(ArgonReserver.baseStorePath, `${escrowSource.sourceKey}.json`);
    this.saveInterval = setInterval(() => this.save(), 5e3).unref();
    this.datastoreLookup = escrowSource.datastoreLookup;
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
      log.error("Error saving EscrowFundsTracker's payments", { error });
    });
  }

  public getEscrowDetails(escrowId: string): IEscrowDetails {
    return this.openEscrowsById[escrowId];
  }

  public async reserve(
    paymentInfo: IPaymentServiceApiTypes['PaymentService.reserve']['args'],
  ): Promise<IPayment> {
    const microgons = paymentInfo.microgons ?? 0;
    if (!microgons || !paymentInfo.recipient) return null;
    let datastoreHost = paymentInfo.host;
    const datastoreId = paymentInfo.id;
    datastoreHost = toUrl(datastoreHost).host;
    await this.load();
    this.reserveQueueByDatastoreId[datastoreId] ??= new Queue();
    this.paymentsByDatastoreId[datastoreId] ??= [];

    return await this.reserveQueueByDatastoreId[datastoreId].run(async () => {
      this.paymentsByDatastoreId[datastoreId] = this.paymentsByDatastoreId[datastoreId].filter(
        x => x.remaining > 0 && (!x.expirationDate || x.expirationDate > new Date()),
      );

      for (const paymentOption of this.paymentsByDatastoreId[datastoreId]) {
        if (paymentOption.remaining >= microgons) {
          if (paymentOption.paymentMethod.escrow?.id) {
            if (paymentOption.host !== datastoreHost) continue;
          }
          return await this.charge(paymentOption, microgons);
        }
      }

      const milligons = this.calculateEscrowMilligons(datastoreId, microgons);
      const details = await this.createEscrow(paymentInfo, milligons);
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
          x.paymentMethod.escrow?.id === payment.paymentId,
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

  public async createEscrow(
    paymentInfo: IPaymentServiceApiTypes['PaymentService.reserve']['args'],
    milligons: bigint,
  ): Promise<IPaymentDetails> {
    const { id, host, version } = paymentInfo;
    if (milligons < ESCROW_MINIMUM_SETTLEMENT) {
      milligons = ESCROW_MINIMUM_SETTLEMENT;
    }

    return await this.escrowQueue.run(async () => {
      const escrow = await this.escrowSource.createEscrow(paymentInfo, milligons);

      const apiClient = this.apiClients.get(host);
      await apiClient.registerEscrow(id, escrow.balanceChange);
      const holdAmount = escrow.balanceChange.escrowHoldNote.milligons;
      const settlement = escrow.balanceChange.notes[0];
      if (settlement.noteType.action !== 'escrowSettle') {
        throw new Error('Invalid escrow balance change');
      }

      const escrowId = escrow.escrowId;
      const allocated = Number(holdAmount) * 1000;
      const entry: IPaymentDetails = {
        paymentMethod: {
          escrow: {
            id: escrowId,
            settledSignature: Buffer.from(escrow.balanceChange.signature),
            settledMilligons: settlement.milligons,
          },
        },
        id,
        version,
        remaining: allocated,
        expirationDate: escrow.expirationDate,
        host,
        allocated,
      };
      this.emit('createdEscrow', {
        escrowId,
        datastoreId: id,
        allocatedMilligons: holdAmount,
      });
      this.openEscrowsById[escrowId] = escrow;
      this.paymentsByDatastoreId[id] ??= [];
      this.paymentsByDatastoreId[id].push(entry);
      return entry;
    });
  }

  protected calculateEscrowMilligons(_datastoreId: string, microgons: number): bigint {
    if (this.escrowAllocationStrategy.type === 'default') {
      return this.escrowAllocationStrategy.milligons;
    }
    if (this.escrowAllocationStrategy.type === 'multiplier') {
      return ArgonUtils.microgonsToMilligons(microgons * this.escrowAllocationStrategy.queries);
    }
    throw new Error(
      'Unknown escrow allocation strategy. Please specify in `config.escrowAllocationStrategy.type`.',
    );
  }

  private async charge(details: IPaymentDetails, microgons: number): Promise<IPayment> {
    if (details.paymentMethod.escrow?.id) {
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
      paymentId: details.paymentMethod.credits?.id ?? details.paymentMethod.escrow?.id,
    };
    this.emit('reserved', {
      payment,
      datastoreId: details.id,
      remainingBalance: details.remaining,
    });
    return payment;
  }

  private async updateSettlement(details: IPaymentDetails, addedMicrogons: number): Promise<void> {
    const escrow = details.paymentMethod.escrow;
    if (!escrow) return;
    const updatedSettlement = BigInt(
      Math.ceil((details.allocated - details.remaining + addedMicrogons) / 1000),
    );
    if (Number(updatedSettlement) * 1000 > details.allocated) {
      throw new Error('Cannot release more than the allocated amount');
    }
    if (updatedSettlement > escrow.settledMilligons) {
      const openEscrow = this.openEscrowsById[escrow.id];
      if (!openEscrow) throw new Error('Escrow not found');
      const result = await this.escrowSource.updateEscrowSettlement(openEscrow, updatedSettlement);
      escrow.settledMilligons = result.notes[0].milligons;
      escrow.settledSignature = result.signature;
      this.needsSave = true;
      this.emit('updateSettlement', {
        escrowId: escrow.id,
        settledMilligons: escrow.settledMilligons,
        datastoreId: details.id,
        remaining: BigInt(details.allocated / 1000) - escrow.settledMilligons,
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
