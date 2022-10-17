import IDataboxObjectBase from '@ulixee/databox-interfaces/IDataboxObject'
import { Browser as PuppeteerBrowser } from 'puppeteer';

type IDataboxObject<T> = IDataboxObjectBase<T> & { browser: PuppeteerBrowser };
export default IDataboxObject;
