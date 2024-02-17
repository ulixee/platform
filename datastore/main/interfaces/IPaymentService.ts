import { IPayment } from '@ulixee/platform-specification';
import IPaymentServiceApiTypes from '@ulixee/platform-specification/datastore/PaymentServiceApis';
import { IPaymentMethod } from '@ulixee/platform-specification/types/IPayment';
import IDatastoreHostLookup from './IDatastoreHostLookup';
import IDatastoreMetadata from './IDatastoreMetadata';

export default interface IPaymentService {
  /**
   * This api is here to create a safety net when payment services are embedded in a datastore calling cloned datastores.
   */
  whitelistRemotes?(
    manifest: IDatastoreMetadata,
    datastoreLookup: IDatastoreHostLookup,
  ): Promise<void>;
  reserve(info: IPaymentServiceApiTypes['PaymentService.reserve']['args']): Promise<IPayment>;
  finalize(info: IPaymentServiceApiTypes['PaymentService.finalize']['args']): Promise<void>;

  attachCredit?(
    datastoreUrl: string,
    credit: IPaymentMethod['credits'],
    datastoreLookup?: IDatastoreHostLookup,
  ): Promise<void>;
}

export interface IUserBalance {
  walletBalance: string; // deposit + credits
  taxBalance: bigint;
  depositBalance: bigint;
  credits: ICredit[];
}

export interface ICredit {
  datastoreId: string;
  datastoreVersion: string;
  allocated: number;
  remaining: number;
  creditsId: string;
  host: string;
}

export interface IPaymentDetails {
  id: string;
  version: string;
  host: string;
  paymentMethod: IPaymentMethod;
  allocated: number;
  remaining: number;
  expirationDate?: Date;
}
