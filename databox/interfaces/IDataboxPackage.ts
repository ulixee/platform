import IDataboxManifest from './IDataboxManifest';

export default interface IDataboxPackage {
  manifest: IDataboxManifest;
  script: string;
  sourceMap: string;
}
