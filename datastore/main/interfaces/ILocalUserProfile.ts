export default interface ILocalUserProfile {
  clouds: { address: string; adminIdentityPath?: string; name: string }[];
  installedDatastores: { cloudHost: string; datastoreId: string; datastoreVersion: string }[];
  gettingStartedCompletedSteps: string[];
  datastoreAdminIdentities: { datastoreId: string; adminIdentityPath?: string }[];
  defaultAddressPath: string;
  defaultAdminIdentityPath: string;
}
