import {
  IHeroSessionArgs,
} from '@ulixee/apps-chromealive-interfaces/apis/ISessionApi';
import SessionObserver from '../lib/SessionObserver';
import ChromeAliveCore from '../index';
import VuePage from '../lib/VuePage';

export default class NavigationApi {
  static async openAbout(): Promise<void> {
    const sessionObserver = getObserver();
    const aboutPage = new VuePage(sessionObserver.heroSession, 'http://ulixee.about');
    await aboutPage.open('/screen-about.html', '/circuits');
  }
}

function getObserver(args?: IHeroSessionArgs): SessionObserver {
  const sessionId = args?.heroSessionId ?? ChromeAliveCore.activeHeroSessionId;
  if (!sessionId || !ChromeAliveCore.sessionObserversById.has(sessionId))
    throw new Error(`No active session found - sessionId: "${sessionId}"`);

  return ChromeAliveCore.sessionObserversById.get(sessionId);
}
