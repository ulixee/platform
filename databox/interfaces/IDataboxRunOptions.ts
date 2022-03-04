import { IHeroCreateOptions } from '@ulixee/hero';

export default interface IDataboxRunOptions<TInput = any>
  extends IHeroCreateOptions {
  action?: string;
  input?: TInput;
  fields?: {};
}
