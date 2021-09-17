import IChromeAliveApi from './IChromeAliveApi';

export default interface ISessionReplayApi extends IChromeAliveApi {
  args: ISessionReplayArgs;
  result: void;
}

export interface ISessionReplayArgs {
  heroSessionId: string;
  percentOffset?: number;
}
