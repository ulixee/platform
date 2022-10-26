import IDataboxObjectBase from '@ulixee/databox-interfaces/IDataboxObject';
import Hero, { HeroReplay } from '@ulixee/hero';

export default interface IDataboxObject<ISchema> extends IDataboxObjectBase<ISchema> {
  hero: Hero;
}

export interface IDataboxObjectForReplay<ISchema> extends IDataboxObjectBase<ISchema> {
  heroReplay: HeroReplay;
}
