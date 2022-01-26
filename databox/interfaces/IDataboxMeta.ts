import ISessionCreateOptions from './ISessionCreateOptions';

export default interface IDataboxMeta
  extends Omit<Required<ISessionCreateOptions>, 'scriptInstanceMeta'> {
  sessionId: string;
}
