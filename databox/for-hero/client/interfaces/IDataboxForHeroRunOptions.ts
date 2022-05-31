import IDataboxRunOptions from '@ulixee/databox-interfaces/IDataboxRunOptions';
import { IHeroCreateOptions } from '@ulixee/hero';

export default interface IDataboxForHeroRunOptions<TInput = any>
  extends IDataboxRunOptions<TInput>,
    IHeroCreateOptions {
  input?: TInput;
}
