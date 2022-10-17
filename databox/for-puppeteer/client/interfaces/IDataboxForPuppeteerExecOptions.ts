import IDataboxExecOptions from '@ulixee/databox-interfaces/IDataboxExecOptions';
import { LaunchOptions as IPuppeteerLaunchOptions } from 'puppeteer';

type IDataboxForPuppeteerRunOptions<ISchema> = IDataboxExecOptions<ISchema> &
  IPuppeteerLaunchOptions;

export default IDataboxForPuppeteerRunOptions;
