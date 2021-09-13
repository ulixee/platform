import { IChromeAliveApi } from './IChromeAliveApi';

export interface ISessionResumeApi extends IChromeAliveApi {
  args: ISessionResumeArgs;
  result: ISessionResumeResult;
}

export interface ISessionResumeArgs {
  heroSessionId: string;
  startFromUrlIndex?: number;
}

export interface ISessionResumeResult {
  success: boolean;
  error?: Error;
}
