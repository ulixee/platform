import { concatAsBuffer } from '@ulixee/commons/lib/bufferUtils';
import { sha256 } from '@ulixee/commons/lib/hashUtils';
import { ConnectionToCore } from '@ulixee/net';
import { IPayment } from '@ulixee/platform-specification';
import { IPaymentServiceApis } from '@ulixee/platform-specification/datastore';
import IPaymentServiceApiTypes from '@ulixee/platform-specification/datastore/PaymentServiceApis';
import { IPaymentMethod } from '@ulixee/platform-specification/types/IPayment';
import Identity from '@ulixee/platform-utils/lib/Identity';
import { nanoid } from 'nanoid';
import IDatastoreHostLookup from '../interfaces/IDatastoreHostLookup';
import IDatastoreMetadata from '../interfaces/IDatastoreMetadata';
import IPaymentService from '../interfaces/IPaymentService';
import CreditPaymentService from './CreditPaymentService';

export default class RemotePaymentService implements IPaymentService {
  /**
   * This stores credits that are controlled on the local machine. It should not be used in a shared environment like a CloudNode.
   */
  private localCreditsByDatastoreId: { [datastoreId: string]: CreditPaymentService[] } = {};
  private authenticationToken: string;
  private whitelistedDatastoreIds: Set<{ id: string; host: string }>;
  private loadedDatastoreIds = new Set<string>();
  private readonly creditPaymentUuidToDatastoreId: { [uuid: string]: string } = {};

  constructor(readonly connectionToCore: ConnectionToCore<IPaymentServiceApis, {}>) {}

  public async loadLocalCredits(): Promise<void> {
    const credits = await CreditPaymentService.loadAll();
    for (const credit of credits) {
      this.localCreditsByDatastoreId[credit.datastoreId] ??= [];
      this.localCreditsByDatastoreId[credit.datastoreId].push(credit);
    }
  }

  public async attachCredit(
    datastoreUrl: string,
    credit: IPaymentMethod['credits'],
    datastoreLookup?: IDatastoreHostLookup,
  ): Promise<void> {
    const service = await CreditPaymentService.lookup(datastoreUrl, credit, datastoreLookup);
    this.localCreditsByDatastoreId[service.datastoreId] ??= [];
    this.localCreditsByDatastoreId[service.datastoreId].push(service);
  }

  public async whitelistRemotes(
    datastoreMetadata: IDatastoreMetadata,
    datastoreLookup: IDatastoreHostLookup,
  ): Promise<void> {
    if (this.loadedDatastoreIds.has(datastoreMetadata.id)) return;
    this.loadedDatastoreIds.add(datastoreMetadata.id);
    this.whitelistedDatastoreIds ??= new Set();
    for (const datastoreUrl of Object.values(datastoreMetadata.remoteDatastores)) {
      const datastoreHost = await datastoreLookup.getHostInfo(datastoreUrl);
      this.whitelistedDatastoreIds.add({ id: datastoreHost.datastoreId, host: datastoreHost.host });
    }
  }

  public async authenticate(identity: Identity): Promise<void> {
    const nonce = nanoid(10);
    const message = RemotePaymentService.getMessage(identity.bech32, nonce);

    const auth = await this.connectionToCore.sendRequest({
      command: 'PaymentService.authenticate',
      args: [
        {
          authentication: {
            identity: identity.bech32,
            signature: identity.sign(message),
            nonce,
          },
        },
      ],
    });
    this.authenticationToken = auth.authenticationToken;
  }

  public async reserve(
    info: IPaymentServiceApiTypes['PaymentService.reserve']['args'],
  ): Promise<IPayment> {
    if (!info.microgons || !info.recipient) return null;
    if (
      this.whitelistedDatastoreIds &&
      !this.whitelistedDatastoreIds.has({ id: info.id, host: info.host })
    )
      throw new Error('This datastore id is not loaded');

    const credits = this.localCreditsByDatastoreId[info.id];
    if (credits) {
      for (const credit of credits) {
        if (credit.hasBalance(info.microgons)) {
          return credit.reserve(info);
        }
      }
    }

    return await this.connectionToCore.sendRequest({
      command: 'PaymentService.reserve',
      args: [{ ...info, authenticationToken: this.authenticationToken }],
    });
  }

  public async finalize(
    info: IPaymentServiceApiTypes['PaymentService.finalize']['args'],
  ): Promise<void> {
    const datastoreId = this.creditPaymentUuidToDatastoreId[info.uuid];
    if (datastoreId) {
      delete this.creditPaymentUuidToDatastoreId[info.uuid];
      for (const credit of this.localCreditsByDatastoreId[datastoreId]) {
        if (credit.canFinalize(info.uuid)) {
          return credit.finalize(info);
        }
      }
    }

    await this.connectionToCore.sendRequest({
      command: 'PaymentService.finalize',
      args: [{ ...info, authenticationToken: this.authenticationToken }],
    });
  }

  public static getMessage(identity: string, nonce: string): Buffer {
    return sha256(concatAsBuffer('PaymentService.authenticate', identity, nonce));
  }
}
