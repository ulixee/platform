import { IHeroCreateOptions } from '@ulixee/hero';

export default interface IDataboxRunOptions<TInput = any>
  extends Partial<
    Omit<ISessionCreateOptions, 'scriptInstanceMeta'>
  >, IHeroCreateOptions {
  action?: string;
  input?: TInput;
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
