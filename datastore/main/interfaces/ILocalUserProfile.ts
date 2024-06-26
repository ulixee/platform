import { IDatabrokerAccount } from './IPaymentService';

export default interface ILocalUserProfile {
  clouds: { address: string; adminIdentityPath?: string; name: string }[];
  installedDatastores: { cloudHost: string; datastoreId: string; datastoreVersion: string }[];
  gettingStartedCompletedSteps: string[];
  datastoreAdminIdentities: { datastoreId: string; adminIdentityPath?: string }[];
  defaultAdminIdentityPath: string;
  localchainPaths: string[];
  databrokers: Omit<IDatabrokerAccount, 'balance'>[];
}
