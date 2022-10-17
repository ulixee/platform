import IDataboxExecOptions from '@ulixee/databox-interfaces/IDataboxExecOptions';
import { IHeroCreateOptions } from '@ulixee/hero';

export default interface IDataboxForHeroExecOptions<TInput = any>
  extends IDataboxExecOptions<TInput>,
    IHeroCreateOptions {
  input?: TInput;
  previousSessionId?: string;
}
