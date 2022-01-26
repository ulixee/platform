import IScriptInstanceMeta from './IScriptInstanceMeta';

export default interface ISessionCreateOptions {
  scriptInstanceMeta?: IScriptInstanceMeta;
  input?: { command?: string } & any;
}
