import IChromeAliveApi from './IChromeAliveApi';

export default interface ISessionQuitApi extends IChromeAliveApi {
  args: ISessionQuitArgs;
  result: void;
}

export interface ISessionQuitArgs {
  heroSessionId: string;
}
