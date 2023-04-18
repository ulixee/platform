export default interface ILocalUserProfile {
  clouds: { address: string; adminIdentityPath?: string; name: string }[];
  installedDatastores: { cloudHost: string; datastoreVersionHash: string }[];
  gettingStartedCompletedSteps: string[];
  datastoreAdminIdentities: { datastoreVersionHash: string; adminIdentityPath?: string }[];
  defaultAddressPath: string;
  defaultAdminIdentityPath: string;
}
