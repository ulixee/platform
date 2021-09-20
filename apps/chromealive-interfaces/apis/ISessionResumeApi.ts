import ISessionCreateOptions from '@ulixee/hero-interfaces/ISessionCreateOptions';
import IChromeAliveApi from './IChromeAliveApi';

export default interface ISessionResumeApi extends IChromeAliveApi {
  args: ISessionResumeArgs;
  result: ISessionResumeResult;
}

export interface ISessionResumeArgs {
  heroSessionId: string;
  startLocation: ISessionCreateOptions['sessionResume']['startLocation'];
  startFromNavigationId?: number;
}

export interface ISessionResumeResult {
  success: boolean;
  error?: Error;
}
