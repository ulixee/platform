import {
  ISessionUrlScreenshotArgs,
  ISessionUrlScreenshotResult,
} from '@ulixee/apps-chromealive-interfaces/apis/ISessionUrlScreenshotApi';
import ChromeAliveCore from '../index';

export default function sessionUrlScreenshotApi(
  args: ISessionUrlScreenshotArgs,
): ISessionUrlScreenshotResult {
  const sessionObserver = ChromeAliveCore.sessionObserversById.get(args.sessionId);

  const loadedurl = sessionObserver.loadedUrls.find(x => x.navigationId === args.navigationId);
  if (!loadedurl) throw new Error('Screenshot not found');

  return {
    imageBase64: loadedurl.screenshotBase64,
  };
}
