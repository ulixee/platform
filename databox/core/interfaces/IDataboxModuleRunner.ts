import IDataboxManifest from '@ulixee/databox-interfaces/IDataboxManfiest';

export default interface IDataboxModuleRunner {
  runsDataboxModuleVersion: string;
  runsDataboxModule: string;
  start(dataDirectory: string, options?: any): Promise<void>;
  close(): Promise<void>;
  run(path: string, manifest: IDataboxManifest, input?: any): Promise<{ output: any }>;
  canSatisfyVersion(version: string): boolean;
}
