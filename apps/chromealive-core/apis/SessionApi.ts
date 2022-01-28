import {
  IHeroSessionArgs,
  ISessionApiStatics,
  ISessionResumeArgs,
} from '@ulixee/apps-chromealive-interfaces/apis/ISessionApi';
import SessionObserver from '../lib/SessionObserver';
import ChromeAliveCore from '../index';

@ISessionApiStatics
export default class SessionApi {
  static getScreenshot(args: IHeroSessionArgs & { tabId: number; timestamp: number }): {
    imageBase64: string;
  } {
    const imageBase64 = getObserver().getScreenshot(args.heroSessionId, args.tabId, args.timestamp);
    return { imageBase64 };
  }

  static async quit(args: IHeroSessionArgs): Promise<void> {
    const sessionObserver = getObserver(args);
    await sessionObserver.heroSession.close(true);
  }

  static async timetravel(
    args: IHeroSessionArgs & {
      percentOffset?: number;
      step?: 'forward' | 'back';
    },
  ): Promise<{
    timelineOffsetPercent: number;
  }> {
    const sessionObserver = getObserver(args);
    let timelineOffsetPercent = args.percentOffset ?? 100;
    // set to timetravel mode in advance to prevent jumping out
    sessionObserver.mode = 'timetravel';
    if (args.step) {
      timelineOffsetPercent = await sessionObserver.timetravelPlayer.step(args.step);
    } else {
      await sessionObserver.timetravelPlayer.goto(timelineOffsetPercent);
    }

    await sessionObserver.timetravelPlayer.showLoadStatus(
      sessionObserver.timelineBuilder.lastMetadata,
    );
    return { timelineOffsetPercent };
  }

  static step(args: IHeroSessionArgs): void {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const observer = getObserver(args);

    // observer.heroSession.commands.pause();
  }

  static async resume(args: ISessionResumeArgs): Promise<{
    success: boolean;
    error?: Error;
  }> {
    const observer = getObserver(args);

    const error = await observer.relaunchSession(args.startLocation, args.startFromNavigationId);

    return {
      success: !error,
      error,
    };
  }
}

function getObserver(args?: IHeroSessionArgs): SessionObserver {
  const sessionId = args?.heroSessionId ?? ChromeAliveCore.activeHeroSessionId;
  if (!sessionId || !ChromeAliveCore.sessionObserversById.has(sessionId))
    throw new Error(`No active session found - sessionId: "${sessionId}"`);

  return ChromeAliveCore.sessionObserversById.get(sessionId);
}
