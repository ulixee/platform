import { IPageStateApiStatics } from '@ulixee/apps-chromealive-interfaces/apis/IPageStateApi';
import ChromeAliveCore from '../index';
import PageStateManager from '../lib/PageStateManager';

@IPageStateApiStatics
export default class PageStateApi {
  static async load(args: { pageStateId: string }): Promise<void> {
    await getPageStateManager().loadPageState(args.pageStateId);
    // TODO: need to tell app to load page?
  }

  static async spawnSession(): Promise<void> {
    await getPageStateManager().addMultiverse();
  }

  static async exit(): Promise<void> {
    await getPageStateManager().close();
  }

  static addState(args: { heroSessionIds: string[]; state: string }): void {
    getPageStateManager().addState(args.state, ...args.heroSessionIds);
  }

  static renameState(args: { state: string; oldValue: string }): void {
    getPageStateManager().renameState(args.state, args.oldValue);
  }

  static async removeState(args: { state: string }): Promise<void> {
    await getPageStateManager().removeState(args.state);
  }

  static async unfocusSession(): Promise<void> {
    await getPageStateManager().unfocusSession();
  }

  static async openSession(args: { heroSessionId: string }): Promise<void> {
    await getPageStateManager().openTimetravel(args.heroSessionId);
  }

  static async modifySessionTimes(args: {
    heroSessionId: string;
    timelineOffset: number;
    isStartTime: boolean;
  }): Promise<void> {
    const pageStateManager = getPageStateManager();
    if (!pageStateManager.isShowingSession(args.heroSessionId)) {
      await pageStateManager.openTimetravel(args.heroSessionId);
    }
    await pageStateManager.changeSessionLoadingTimeBoundary(args.timelineOffset, args.isStartTime);
  }

  static async extendSessionTime(args: {
    heroSessionId: string;
    addMillis: number;
  }): Promise<void> {
    const pageStateManager = getPageStateManager();
    await pageStateManager.extendSessionTime(args.heroSessionId, args.addMillis);
  }

  static async focusSessionTime(args: {
    heroSessionId: string;
    isStartTime: boolean;
  }): Promise<void> {
    const pageStateManager = getPageStateManager();
    if (!pageStateManager.isShowingSession(args.heroSessionId)) {
      await pageStateManager.openTimetravel(args.heroSessionId);
    }
    await pageStateManager.focusSessionLoadingTimeBoundary(args.isStartTime);
  }

  static save(): Promise<{ needsCodeChange: boolean; code: string }> {
    return getPageStateManager().save();
  }
}

function getPageStateManager(): PageStateManager {
  return ChromeAliveCore.activeSessionObserver.pageStateManager;
}
