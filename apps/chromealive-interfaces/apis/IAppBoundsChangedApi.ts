import IChromeAliveApi from './IChromeAliveApi';

export default interface IAppBoundsChangedApi extends IChromeAliveApi {
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
  workarea: IBounds;
  appBounds: IBounds;
  toolbarBounds: IBounds;
}

export interface IAppBoundsChangedResult {
  error?: Error;
}
