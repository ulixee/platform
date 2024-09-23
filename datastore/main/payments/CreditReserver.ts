import { debounce } from '@ulixee/commons/lib/asyncUtils';
import { getDataDirectory } from '@ulixee/commons/lib/dirUtils';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import { existsAsync, readFileAsJson, safeOverwriteFile } from '@ulixee/commons/lib/fileUtils';
import Logger from '@ulixee/commons/lib/Logger';
import Queue from '@ulixee/commons/lib/Queue';
import TypeSerializer from '@ulixee/commons/lib/TypeSerializer';
import { toUrl } from '@ulixee/commons/lib/utils';
import { IPayment } from '@ulixee/platform-specification';
import IPaymentServiceApiTypes from '@ulixee/platform-specification/datastore/PaymentServiceApis';
import { IDatastorePaymentRecipient } from '@ulixee/platform-specification/types/IDatastoreManifest';
import { IPaymentMethod } from '@ulixee/platform-specification/types/IPayment';
import { nanoid } from 'nanoid';
import { mkdir, readdir, unlink } from 'node:fs/promises';
import * as Path from 'node:path';
import IDatastoreHostLookup from '../interfaces/IDatastoreHostLookup';
import {
  ICredit,
  IPaymentDetails,
  IPaymentEvents,
  IPaymentReserver,
} from '../interfaces/IPaymentService';
import DatastoreApiClient from '../lib/DatastoreApiClient';
import DatastoreLookup from '../lib/DatastoreLookup';

const { log } = Logger(module);

export default class CreditReserver
  extends TypedEventEmitter<IPaymentEvents>
  implements IPaymentReserver
{
  public static MIN_BALANCE = 1;
  static defaultBasePath = Path.join(getDataDirectory(), 'ulixee', 'credits');

  public get datastoreId(): string {
    return this.paymentDetails.id;
  }

  public get credit(): ICredit {
    return {
      datastoreId: this.paymentDetails.id,
      datastoreVersion: this.paymentDetails.version,
      allocated: this.paymentDetails.allocated,
      remaining: this.paymentDetails.remaining,
      creditsId: this.paymentDetails.paymentMethod.credits.id,
      host: this.paymentDetails.host,
    };
  }

  public paymentDetails: IPaymentDetails;

  public storePath: string;
  private isClosed = false;
  private readonly saveDebounce: (canDelete: boolean) => void;
  private queue = new Queue();

  private paymentsPendingFinalization: {
    [uuid: string]: { microgons: number; datastoreId: string };
  } = {};

  constructor(
    credit: IPaymentDetails,
    private baseDir: string,
  ) {
    super();
    if (!credit.paymentMethod.credits)
      throw new Error('CreditReserver requires a credit payment method');
    this.storePath = Path.join(baseDir, `${credit.id}-${credit.paymentMethod.credits.id}.json`);
    this.paymentDetails = credit;
    this.saveDebounce = debounce(this.save.bind(this), 1_000, 5_000);
  }

  public async getPaymentInfo(): Promise<IDatastorePaymentRecipient | undefined> {
    return undefined;
  }

  public hasBalance(microgons: number): boolean {
    return this.paymentDetails.remaining >= microgons;
  }

  public async reserve(
    paymentInfo: IPaymentServiceApiTypes['PaymentService.reserve']['args'],
  ): Promise<IPayment> {
    const microgons = paymentInfo.microgons ?? 0;
    if (paymentInfo.id !== this.paymentDetails.id) throw new Error('Datastore id does not match');

    return await this.queue.run(async () => {
      if (!this.hasBalance(microgons)) {
        throw new Error('Insufficient credits balance');
      }
      this.paymentDetails.remaining -= microgons;
      this.saveDebounce(false);
      const payment = {
        uuid: nanoid(),
        microgons,
        ...this.paymentDetails.paymentMethod,
      };
      this.paymentsPendingFinalization[payment.uuid] = { microgons, datastoreId: paymentInfo.id };
      this.emit('reserved', {
        payment,
        datastoreId: paymentInfo.id,
        remainingBalance: this.paymentDetails.remaining,
      });
      return payment;
    });
  }

  public canFinalize(uuid: string): boolean {
    return uuid in this.paymentsPendingFinalization;
  }

  public async finalize(
    paymentInfo: IPaymentServiceApiTypes['PaymentService.finalize']['args'],
  ): Promise<void> {
    const { microgons, finalMicrogons, uuid } = paymentInfo;
    const payment = this.paymentsPendingFinalization[uuid];
    delete this.paymentsPendingFinalization[uuid];
    if (payment) {
      return await this.queue.run(async () => {
        this.paymentDetails.remaining += microgons - finalMicrogons;
        this.emit('finalized', {
          finalMicrogons,
          initialMicrogons: microgons,
          paymentUuid: uuid,
          remainingBalance: this.paymentDetails.remaining,
        });
        this.saveDebounce(true);
      });
    }
  }

  public async close(): Promise<void> {
    await this.save();
    this.isClosed = true;
  }

  public async save(canDelete = false): Promise<void> {
    if (this.isClosed) return;
    await this.writeToDisk(canDelete).catch(error => {
      log.error('Error saving credit amount', {
        error,
        creditId: this.paymentDetails.paymentMethod.credits.id,
      } as any);
    });
  }

  private async writeToDisk(canDelete: boolean): Promise<void> {
    if (!(await existsAsync(this.baseDir))) {
      await mkdir(this.baseDir, { recursive: true });
    }

    if (canDelete && this.paymentDetails.remaining <= CreditReserver.MIN_BALANCE) {
      return await unlink(this.storePath);
    }
    await safeOverwriteFile(
      this.storePath,
      TypeSerializer.stringify(this.paymentDetails, { format: true }),
    );
  }

  public static async loadAll(
    fromDir: string = CreditReserver.defaultBasePath,
  ): Promise<CreditReserver[]> {
    if (!(await existsAsync(fromDir))) return [];
    const creditFiles = await readdir(fromDir, {
      withFileTypes: true,
    });

    const credits = await Promise.all(
      creditFiles.map(async file => {
        if (!file.isFile() || !file.name.endsWith('.json')) return null;
        const path = Path.join(fromDir, file.name);
        const credit = await readFileAsJson<IPaymentDetails>(path);
        if (!credit.paymentMethod.credits) return null;
        return new CreditReserver(credit, fromDir);
      }),
    );
    return credits.filter(x => x !== null);
  }

  public static async load(
    datastoreId: string,
    creditId: string,
    fromDir = CreditReserver.defaultBasePath,
  ): Promise<CreditReserver> {
    const storePath = Path.join(fromDir, `${datastoreId}-${creditId}.json`);
    const credit = await readFileAsJson<IPaymentDetails>(storePath);
    return new CreditReserver(credit, fromDir);
  }

  public static async storeCredit(
    datastoreId: string,
    datastoreVersion: string,
    host: string,
    credits: { id: string; secret: string; remainingCredits: number },
    creditsDir = CreditReserver.defaultBasePath,
  ): Promise<CreditReserver> {
    const service = new CreditReserver(
      {
        id: datastoreId,
        version: datastoreVersion,
        allocated: credits.remainingCredits,
        remaining: credits.remainingCredits,
        paymentMethod: {
          credits: {
            id: credits.id,
            secret: credits.secret,
          },
        },
        host,
      },
      creditsDir,
    );
    await service.save();
    return service;
  }

  public static async lookup(
    datastoreUrl: string,
    credit: IPaymentMethod['credits'],
    datastoreLookup?: IDatastoreHostLookup,
    creditsDir = CreditReserver.defaultBasePath,
  ): Promise<CreditReserver> {
    const datastoreURL = toUrl(datastoreUrl);
    const datastoreHost =
      (await datastoreLookup?.getHostInfo(datastoreUrl)) ??
      DatastoreLookup.parseDatastoreIpHost(datastoreURL);

    if (!datastoreHost) throw new Error('This datastoreUrl could not be parsed');
    const { datastoreId, version, host } = datastoreHost;
    const client = new DatastoreApiClient(host);
    try {
      const balance = await client.getCreditsBalance(datastoreId, version, credit.id);
      const service = new CreditReserver(
        {
          id: datastoreId,
          version,
          allocated: balance.issuedCredits,
          remaining: balance.balance,
          paymentMethod: {
            credits: credit,
          },
          host,
        },
        creditsDir,
      );
      await service.save();
      return service;
    } catch (error) {
      throw new Error(`Error looking up credit ${credit.id} for datastore ${datastoreId}`);
    } finally {
      if (!client) await client.disconnect();
    }
  }

  public static async storeCreditFromUrl(
    url: string,
    microgons: number,
    datastoreLookup?: IDatastoreHostLookup,
  ): Promise<CreditReserver> {
    const datastoreURL = toUrl(url);
    const datastoreHost =
      (await datastoreLookup?.getHostInfo(url)) ??
      DatastoreLookup.parseDatastoreIpHost(datastoreURL);

    if (!datastoreHost) throw new Error('This datastoreUrl could not be parsed');

    const { datastoreId, version, host } = datastoreHost;
    return await CreditReserver.storeCredit(datastoreId, version, host, {
      id: datastoreURL.username,
      secret: datastoreURL.password,
      remainingCredits: microgons,
    });
  }
}
