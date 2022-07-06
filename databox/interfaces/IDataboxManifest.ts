export default interface IDataboxManifest {
  versionHash: string;
  versionTimestamp: number;
  linkedVersions: IVersionHistoryEntry[];
  scriptHash: string;
  scriptEntrypoint: string;
  runtimeName: string;
  runtimeVersion: string;
}

export interface IVersionHistoryEntry {
  versionHash: string;
  versionTimestamp: number;
}
