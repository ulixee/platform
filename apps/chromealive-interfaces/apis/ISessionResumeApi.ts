import IChromeAliveApi from './IChromeAliveApi';

export default interface ISessionResumeApi extends IChromeAliveApi {
  args: ISessionResumeArgs;
  result: ISessionResumeResult;
}

export interface ISessionResumeArgs {
  sessionId: string;
  startFromTick?: number;
}

export interface ISessionResumeResult {
  success: boolean;
  error?: Error;
}
