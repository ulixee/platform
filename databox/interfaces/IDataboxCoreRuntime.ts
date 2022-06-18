import IDataboxManifest from './IDataboxManifest';

export default interface IDataboxCoreRuntime {
  databoxRuntimeVersion: string;
  databoxRuntimeName: string;
  start(dataDirectory: string, options?: any): Promise<void>;
  close(): Promise<void>;
  run(path: string, manifest: IDataboxManifest, input?: any): Promise<{ output: any }>;
  canSatisfyVersion(version: string): boolean;
}
