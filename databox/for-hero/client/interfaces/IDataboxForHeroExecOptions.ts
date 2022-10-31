import IDataboxExecOptions from '@ulixee/databox-interfaces/IDataboxExecOptions';
import { IHeroCreateOptions } from '@ulixee/hero';

type IDataboxForHeroExecOptions<ISchema> = IDataboxExecOptions<ISchema> & IHeroCreateOptions;
export default IDataboxForHeroExecOptions;
