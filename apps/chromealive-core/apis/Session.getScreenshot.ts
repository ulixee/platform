import {
  ISessionGetScreenshotArgs,
  ISessionGetScreenshotResult,
} from '@ulixee/apps-chromealive-interfaces/apis/ISessionGetScreenshotApi';
import ChromeAliveCore from '../index';

export default function sessionGetScreenshotApi(
  args: ISessionGetScreenshotArgs,
): ISessionGetScreenshotResult {
  const sessionObserver = ChromeAliveCore.sessionObserversById.get(args.sessionId);

  const screenshot = sessionObserver.screenshotsByTimestamp.get(args.timestamp);
  if (!screenshot) throw new Error('Screenshot not found');

  return {
    imageBase64: screenshot.imageBase64,
  };
}
