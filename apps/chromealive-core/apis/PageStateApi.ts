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

  static removeState(args: { state: string }): void {
    getPageStateManager().removeState(args.state);
  }

  static unfocusSession(): void {
    getPageStateManager().unfocusSession();
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
    await pageStateManager.changeSessionTimeBoundary(args.timelineOffset, args.isStartTime);
  }

  static async focusSessionTime(args: {
    heroSessionId: string;
    isStartTime: boolean;
  }): Promise<void> {
    const pageStateManager = getPageStateManager();
    if (!pageStateManager.isShowingSession(args.heroSessionId)) {
      await pageStateManager.openTimetravel(args.heroSessionId);
    }
    await pageStateManager.focusSessionTimeBoundary(args.isStartTime);
  }

  static save(): Promise<{ needsCodeChange: boolean; code: string }> {
    return getPageStateManager().save();
  }
}

function getPageStateManager(): PageStateManager {
  return ChromeAliveCore.activeSessionObserver.pageStateManager;
}
