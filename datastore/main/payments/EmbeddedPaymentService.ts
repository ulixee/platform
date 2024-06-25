import { toUrl } from '@ulixee/commons/lib/utils';
import { IPayment } from '@ulixee/platform-specification';
import IPaymentServiceApiTypes from '@ulixee/platform-specification/datastore/PaymentServiceApis';
import IDatastoreHostLookup from '../interfaces/IDatastoreHostLookup';
import IDatastoreMetadata from '../interfaces/IDatastoreMetadata';
import CreditReserver from './CreditReserver';
import DefaultPaymentService from './DefaultPaymentService';

/**
 * A Payment service meant to be embedded - includes a whitelist of upstream datastores
 */
export default class EmbeddedPaymentService extends DefaultPaymentService {
  /**
   * Security feature to enable only specific datastores to create escrows.
   *
   * Key is host_id
   */
  private whitelistedDatastoreIds = new Set<string>();
  /**
   * Indicates which datastores have been loaded into the IPaymentService['whitelistRemotes'] call
   */
  private loadedDatastoreIds = new Set<string>();

  public async whitelistRemotes(
    manifest: IDatastoreMetadata,
    datastoreLookup: IDatastoreHostLookup,
  ): Promise<void> {
    if (!manifest.remoteDatastores) return;
    if (this.loadedDatastoreIds.has(manifest.id)) return;

    this.loadedDatastoreIds.add(manifest.id);

    for (const [remoteSource, datastoreUrl] of Object.entries(manifest.remoteDatastores)) {
      const datastoreHost = await datastoreLookup.getHostInfo(datastoreUrl);
      this.whitelistedDatastoreIds.add(`${datastoreHost.host}_${datastoreHost.datastoreId}`);
      const credit = manifest.remoteDatastoreEmbeddedCredits[remoteSource];
      if (credit) {
        const service = await CreditReserver.lookup(
          datastoreUrl,
          credit,
          datastoreLookup,
          this.creditsPath,
        );
        this.addCredit(service);
      }
    }
  }

  public override async reserve(
    info: IPaymentServiceApiTypes['PaymentService.reserve']['args'],
  ): Promise<IPayment> {
    if (!info.microgons || !info.recipient) return null;
    const host = toUrl(info.host).host;
    if (!this.whitelistedDatastoreIds.has(`${host}_${info.id}`)) {
      throw new Error(
        `The host ${info.host} is not whitelisted to create escrows for datastore ${info.id}`,
      );
    }

    return super.reserve(info);
  }
}
