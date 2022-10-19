import { IHeroCreateOptions } from '@ulixee/hero';
import IComponentsBase, {
  IDefaultsObj as IDefaultsObjBase,
} from '@ulixee/databox/interfaces/IComponents';
import IDataboxObject, { IDataboxObjectForReplay } from './IDataboxObject';

type IComponents<ISchema> = IComponentsBase<
  ISchema,
  IDataboxObject<ISchema>,
  IDefaultsObj<ISchema>
> & {
  onAfterHeroCompletes?: (databox: IDataboxObjectForReplay<ISchema>) => Promise<void> | void;
};

export default IComponents;

export type IDefaultsObj<ISchema> = IDefaultsObjBase<ISchema> & {
  hero?: Partial<IHeroCreateOptions>;
};
