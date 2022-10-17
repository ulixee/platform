import IDataboxExecOptions from '@ulixee/databox-interfaces/IDataboxExecOptions';
import { LaunchOptions as IPuppeteerLaunchOptions } from 'puppeteer';

export default interface IDataboxForPuppeteerRunOptions<TInput = any>
  extends IDataboxExecOptions<TInput>,
  IPuppeteerLaunchOptions {
  input?: TInput;
}
