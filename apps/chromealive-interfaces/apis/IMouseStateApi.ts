import { IChromeAliveApi } from './IChromeAliveApi';

export interface IMouseStateApi extends IChromeAliveApi {
  args: IMouseStateArgs;
  result: void;
}

export interface IMouseStateArgs {
  isMousedown: boolean;
}
