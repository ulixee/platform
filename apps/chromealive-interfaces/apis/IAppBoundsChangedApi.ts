import { IChromeAliveApi } from './IChromeAliveApi';

export interface IAppBoundsChangedApi extends IChromeAliveApi {
  args: IAppBoundsChangedArgs;
  result: IAppBoundsChangedResult;
}

export interface IBounds {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface IAppBoundsChangedArgs {
  bounds: IBounds;
}

export interface IAppBoundsChangedResult {
  error?: Error;
}
