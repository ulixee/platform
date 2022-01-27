import { IHeroCreateOptions } from '@ulixee/hero';

export default interface IDataboxRunOptions
  extends Partial<
    Omit<ISessionCreateOptions, 'scriptInstanceMeta'>
  >, IHeroCreateOptions {
  action?: string;
  input?: {};
  fields?: {};
}

export interface ISessionCreateOptions {
  scriptInstanceMeta?: IScriptInstanceMeta;
  input?: { command?: string } & any;
}

export interface IScriptInstanceMeta {
  id: string;
  entrypoint: string;
  startDate: number;
}
