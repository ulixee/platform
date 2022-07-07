export interface IDataboxApiHandlerFns {
  upload(dbxBuffer: Buffer, allowNewLinkedVersionHistory: boolean): Promise<void>;
  run(scriptHash: string, input?: any): Promise<{ output?: any; error?: any }>;
  runLocalScript(scriptHash: string, input?: any): Promise<{ output?: any; error?: any }>;
}

export type IDataboxApis = {
  'Databox.upload': IDataboxApiHandlerFns['upload'];
  'Databox.run': IDataboxApiHandlerFns['run'];
  'Databox.runLocalScript': IDataboxApiHandlerFns['runLocalScript'];
};
