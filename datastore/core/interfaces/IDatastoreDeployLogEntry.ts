export default interface IDatastoreDeployLogEntry {
  scriptEntrypoint: string;
  cloudHost: string;
  versionHash: string;
  timestamp: number;
  adminIdentity?: string;
}
