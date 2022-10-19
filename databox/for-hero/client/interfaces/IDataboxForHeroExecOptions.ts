import IDataboxExecOptions from '@ulixee/databox-interfaces/IDataboxExecOptions';
import { IHeroCreateOptions } from '@ulixee/hero';

type IDataboxForHeroExecOptions<ISchema> = IDataboxExecOptions<ISchema> &
  IHeroCreateOptions & {
    previousSessionId?: string;
  };
export default IDataboxForHeroExecOptions;
