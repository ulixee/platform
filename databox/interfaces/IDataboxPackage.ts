import IDataboxManifest from './IDataboxManfiest';

export default interface IDataboxPackage {
  manifest: IDataboxManifest;
  script: string;
  sourceMap: string;
}
