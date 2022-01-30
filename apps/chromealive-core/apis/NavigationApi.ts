import {
  IHeroSessionArgs,
} from '@ulixee/apps-chromealive-interfaces/apis/ISessionApi';
import SessionObserver from '../lib/SessionObserver';
import ChromeAliveCore from '../index';
import AboutPage from '../lib/AboutPage';

export default class NavigationApi {
  static async openAbout(): Promise<void> {
    const sessionObserver = getObserver();
    const aboutPage = new AboutPage(sessionObserver.heroSession);
    await aboutPage.open('circuits');
  }
}

function getObserver(args?: IHeroSessionArgs): SessionObserver {
  const sessionId = args?.heroSessionId ?? ChromeAliveCore.activeHeroSessionId;
  if (!sessionId || !ChromeAliveCore.sessionObserversById.has(sessionId))
    throw new Error(`No active session found - sessionId: "${sessionId}"`);

  return ChromeAliveCore.sessionObserversById.get(sessionId);
}
