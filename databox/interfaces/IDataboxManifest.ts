export default interface IDataboxManifest {
  scriptVersionHash: string;
  scriptVersionHashToCreatedDate: { [scriptVersionHash: string]: number };
  scriptEntrypoint: string;
  runtimeName: string;
  runtimeVersion: string;
}
