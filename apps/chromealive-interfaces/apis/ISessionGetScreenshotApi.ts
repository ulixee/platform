import IChromeAliveApi from './IChromeAliveApi';

export default interface ISessionGetScreenshotApi extends IChromeAliveApi {
  args: ISessionGetScreenshotArgs;
  result: ISessionGetScreenshotResult;
}

export interface ISessionGetScreenshotArgs {
  sessionId: string;
  timestamp: number;
}

export interface ISessionGetScreenshotResult {
  imageBase64: string;
}
