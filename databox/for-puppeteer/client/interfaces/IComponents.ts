import { LaunchOptions as IPuppeteerLaunchOptions } from 'puppeteer';
import IComponentsBase, { IDefaultsObj as IDefaultsObjBase } from '@ulixee/databox/interfaces/IComponents';
import IDataboxObject from './IDataboxObject';

type IComponents<ISchema> = IComponentsBase<
  ISchema,
  IDataboxObject<ISchema>,
  IDefaultsObj<ISchema>
>;
export default IComponents;

export type IDefaultsObj<ISchema> = IDefaultsObjBase<ISchema> & {
  puppeteer?: Partial<IPuppeteerLaunchOptions>;
};
