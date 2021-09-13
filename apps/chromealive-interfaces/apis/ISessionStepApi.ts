import { IChromeAliveApi } from './IChromeAliveApi';

export interface ISessionStepApi extends IChromeAliveApi {
  args: ISessionStepArgs;
  result: ISessionStepResult;
}

export interface ISessionStepArgs {
  heroSessionId: string;
  continue?: boolean;
}

export interface ISessionStepResult {
  success: boolean;
}
