import IChromeAliveApi from './IChromeAliveApi';

export default interface ISessionTickScreenshotApi extends IChromeAliveApi {
  args: ISessionTickScreenshotArgs;
  result: ISessionTickScreenshotResult;
}

export interface ISessionTickScreenshotArgs {
  sessionId: string;
  navigationId: number;
}

export interface ISessionTickScreenshotResult {
  imageBase64: string;
}
