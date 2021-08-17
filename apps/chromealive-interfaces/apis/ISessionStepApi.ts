import IChromeAliveApi from './IChromeAliveApi';

export default interface ISessionStepApi extends IChromeAliveApi {
  args: ISessionStepArgs;
  result: ISessionStepResult;
}

export interface ISessionStepArgs {
  sessionId: string;
  continue?: boolean;
}

export interface ISessionStepResult {
  success: boolean;
}
