import IChromeAliveApi from './IChromeAliveApi';
import { IBounds } from './IAppBoundsChangedApi';

export default interface IAppReadyApi extends IChromeAliveApi {
  args: IAppReadyArgs;
  result: void;
}

export interface IAppReadyArgs {
  workarea: IBounds;
}
