import IDevtoolsBackdoorApi from '@ulixee/apps-chromealive-interfaces/apis/IDevtoolsBackdoorApi';
import { IHeroSessionArgs } from '@ulixee/apps-chromealive-interfaces/apis/ISessionApi';
import SessionObserver from '../lib/SessionObserver';
import ChromeAliveCore from '../index';

export default class DevtoolsBackdoorApi {
  static toggleInspectElementMode(): ReturnType<IDevtoolsBackdoorApi['toggleInspectElementMode']> {
    const sessionObserver = getObserver();
    return sessionObserver
      .toggleInspectElementMode()
      .catch(err => console.error('ERROR toggleInspectElementMode', err));
  }

  static highlightNode(args?: Parameters<IDevtoolsBackdoorApi['highlightNode']>[0]): ReturnType<IDevtoolsBackdoorApi['highlightNode']> {
    const sessionObserver = getObserver();
    return sessionObserver
      .highlightNode(args.backendNodeId)
      .catch(err => console.error('ERROR highlightNode', err));
  }

  static hideHighlight(): ReturnType<IDevtoolsBackdoorApi['hideHighlight']> {
    const sessionObserver = getObserver();
    return sessionObserver
      .hideHighlight()
      .catch(err => console.error('ERROR hideHighlight', err));
  }

  static searchElements(args?: Parameters<IDevtoolsBackdoorApi['searchElements']>[0]): ReturnType<IDevtoolsBackdoorApi['searchElements']> {
    const sessionObserver = getObserver();
    return sessionObserver
      .searchElements(args.query)
      .catch(err => {
        console.error('ERROR searchElements', err);
        return [];
      });
  }

  static generateQuerySelector(args?: Parameters<IDevtoolsBackdoorApi['generateQuerySelector']>[0]): ReturnType<IDevtoolsBackdoorApi['generateQuerySelector']> {
    const sessionObserver = getObserver();
    return sessionObserver
      .generateQuerySelector(args.backendNodeId)
      .catch(err => {
        console.error('ERROR generateQuerySelector', err);
        return [];
      });
  }
}

function getObserver(args?: IHeroSessionArgs): SessionObserver {
  const sessionId = args?.heroSessionId ?? ChromeAliveCore.activeHeroSessionId;
  if (!sessionId || !ChromeAliveCore.sessionObserversById.has(sessionId))
    throw new Error(`No active session found - sessionId: "${sessionId}"`);

  return ChromeAliveCore.sessionObserversById.get(sessionId);
}
