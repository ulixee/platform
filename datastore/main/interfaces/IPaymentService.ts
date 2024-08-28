import ITypedEventEmitter from '@ulixee/commons/interfaces/ITypedEventEmitter';
import { LocalchainOverview, BalanceChangeStatus } from '@argonprotocol/localchain';
import { IPayment } from '@ulixee/platform-specification';
import IPaymentServiceApiTypes from '@ulixee/platform-specification/datastore/PaymentServiceApis';
import { IPaymentMethod } from '@ulixee/platform-specification/types/IPayment';
import IDatastoreHostLookup from './IDatastoreHostLookup';
import IDatastoreMetadata from './IDatastoreMetadata';

export interface IPaymentEvents {
  reserved: { datastoreId: string; payment: IPayment; remainingBalance: number };
  finalized: {
    paymentUuid: string;
    initialMicrogons: number;
    finalMicrogons: number;
    remainingBalance: number;
  };
  createdEscrow: { escrowId: string; datastoreId: string; allocatedMilligons: bigint };
  updateSettlement: {
    escrowId: string;
    settledMilligons: bigint;
    remaining: bigint;
    datastoreId: string;
  };
}

export interface IPaymentReserver extends ITypedEventEmitter<IPaymentEvents> {
  datastoreLookup?: IDatastoreHostLookup;
  reserve(info: IPaymentServiceApiTypes['PaymentService.reserve']['args']): Promise<IPayment>;
  finalize(info: IPaymentServiceApiTypes['PaymentService.finalize']['args']): Promise<void>;
  close(): Promise<void>;
}

export default interface IPaymentService extends IPaymentReserver {
  /**
   * This api is here to create a safety net when payment services are embedded in a datastore calling cloned datastores.
   */
  whitelistRemotes?(
    manifest: IDatastoreMetadata,
    datastoreLookup: IDatastoreHostLookup,
  ): Promise<void>;

  attachCredit?(
    datastoreUrl: string,
    credit: IPaymentMethod['credits'],
    datastoreLookup?: IDatastoreHostLookup,
  ): Promise<void>;
}
export { BalanceChangeStatus };

export interface IDatabrokerAccount {
  host: string;
  userIdentity: string;
  name?: string;
  balance: bigint;
}

export interface IWallet {
  accounts: LocalchainOverview[];
  formattedBalance: string;
  credits: ICredit[];
  brokerAccounts: IDatabrokerAccount[];
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
