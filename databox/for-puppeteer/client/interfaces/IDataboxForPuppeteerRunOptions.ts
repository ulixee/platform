import IDataboxRunOptions from '@ulixee/databox-interfaces/IDataboxRunOptions';
import { LaunchOptions as IPuppeteerLaunchOptions } from 'puppeteer';

export default interface IDataboxForPuppeteerRunOptions<TInput = any>
  extends IDataboxRunOptions<TInput>,
  IPuppeteerLaunchOptions {
  input?: TInput;
}
