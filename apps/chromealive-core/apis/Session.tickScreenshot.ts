import {
  ISessionTickScreenshotArgs,
  ISessionTickScreenshotResult,
} from '@ulixee/apps-chromealive-interfaces/apis/ISessionTickScreenshotApi';
import ChromeAliveCore from '../index';

export default function sessionTickScreenshotApi(
  args: ISessionTickScreenshotArgs,
): ISessionTickScreenshotResult {
  const sessionObserver = ChromeAliveCore.sessionObserversById.get(args.sessionId);

  const tick = sessionObserver.ticks.find(x => x.navigationId === args.navigationId);
  if (!tick) throw new Error('Tick not found');

  return {
    imageBase64: tick.screenshotBase64,
  };
}
