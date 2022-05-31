import IDataboxPackage from './IDataboxPackage';

export interface IDataboxApiHandlerFns {
  upload(databoxPackage: IDataboxPackage): Promise<void>;
  run(scriptHash: string, input?: any): Promise<{ output?: any; error?: any }>;
}

export type IDataboxApis = {
  'Databox.upload': IDataboxApiHandlerFns['upload'];
  'Databox.run': IDataboxApiHandlerFns['run'];
};
