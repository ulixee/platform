import { IDomStateApiStatics } from '@ulixee/apps-chromealive-interfaces/apis/IDomStateApi';
import ChromeAliveCore from '../index';
import DomStateManager from '../lib/DomStateManager';

@IDomStateApiStatics
export default class DomStateApi {
  static async load(args: { domStateId: string }): Promise<void> {
    await getDomStateManager().loadDomState(args.domStateId);
    // TODO: need to tell app to load page?
  }

  static async spawnSession(): Promise<void> {
    await getDomStateManager().addMultiverse();
  }

  static async exit(): Promise<void> {
    await getDomStateManager().close();
  }

  static async unfocusSession(): Promise<void> {
    await getDomStateManager().unfocusSession();
  }

  static async openSession(args: { heroSessionId: string }): Promise<void> {
    await getDomStateManager().openTimetravel(args.heroSessionId);
  }

  static async modifySessionTimes(args: {
    heroSessionId: string;
    timelineOffset: number;
    isStartTime: boolean;
  }): Promise<void> {
    const domStateManager = getDomStateManager();
    if (!domStateManager.isShowingSession(args.heroSessionId)) {
      await domStateManager.openTimetravel(args.heroSessionId);
    }
    await domStateManager.changeSessionLoadingTimeBoundary(args.timelineOffset, args.isStartTime);
  }

  static async extendSessionTime(args: {
    heroSessionId: string;
    addMillis: number;
  }): Promise<void> {
    const domStateManager = getDomStateManager();
    await domStateManager.extendSessionTime(args.heroSessionId, args.addMillis);
  }

  static async focusSessionTime(args: {
    heroSessionId: string;
    isStartTime: boolean;
  }): Promise<void> {
    const domStateManager = getDomStateManager();
    if (!domStateManager.isShowingSession(args.heroSessionId)) {
      await domStateManager.openTimetravel(args.heroSessionId);
    }
    await domStateManager.focusSessionLoadingTimeBoundary(args.isStartTime);
  }
}

function getDomStateManager(): DomStateManager {
  return ChromeAliveCore.activeSessionObserver.domStateManager;
}
