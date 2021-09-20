import IChromeAliveApi from './IChromeAliveApi';

export default interface ISessionReplayApi extends IChromeAliveApi {
  args: ISessionReplayArgs;
  result: ISessionReplayResult;
}

export interface ISessionReplayArgs {
  heroSessionId: string;
  percentOffset?: number;
  step?: 'forward' | 'back';
}

export interface ISessionReplayResult {
  timelineOffsetPercent: number;
}
