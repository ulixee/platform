import ISessionApi, {
  IHeroSessionArgs,
  ISessionApiStatics,
  ISessionResumeArgs,
} from '@ulixee/apps-chromealive-interfaces/apis/ISessionApi';
import { CanceledPromiseError } from '@ulixee/commons/interfaces/IPendingWaitEvent';
import SessionObserver from '../lib/SessionObserver';
import ChromeAliveCore from '../index';

@ISessionApiStatics
export default class SessionApi {
  static getScreenshot(): {
    imageBase64: string;
  } {
    return { imageBase64: null };
  }

  static async quit(args: IHeroSessionArgs): Promise<void> {
    const sessionObserver = getObserver(args);
    await sessionObserver.heroSession.close(true);
  }

  static getScriptState(args?: IHeroSessionArgs): ReturnType<ISessionApi['getScriptState']> {
    const sessionObserver = getObserver(args);

    return Promise.resolve(sessionObserver.sourceCodeTimeline.getCurrentState());
  }

  static getDom(args?: IHeroSessionArgs & { tabId?: number }): ReturnType<ISessionApi['getDom']> {
    const sessionObserver = getObserver(args);
    return sessionObserver.getDomRecording(args?.tabId);
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
    try {
      return await sessionObserver.timetravel(args.percentOffset, args.step);
    } catch (err) {
      if (err instanceof CanceledPromiseError) {
        return { timelineOffsetPercent: 100 };
      }
      throw err;
    }
  }

  static openPanel(args: Parameters<ISessionApi['openPanel']>[0]): void {
    const sessionObserver = getObserver(args);
    sessionObserver
      .openPanel(args.panel)
      .catch(err => console.error('ERROR opening panel %s', args.panel, err));
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
