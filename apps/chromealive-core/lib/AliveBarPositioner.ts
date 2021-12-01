import Log from '@ulixee/commons/lib/Logger';
import { IBounds } from '@ulixee/apps-chromealive-interfaces/IBounds';
import { defaultScreen } from '@ulixee/default-browser-emulator/lib/Viewports';
import ChromeAliveCore from '../index';

const { log } = Log(module);

export default class AliveBarPositioner {
  public static workarea: IBounds;
  public static chromeToolsHeight = 79;
  private static lastAppBounds: IBounds = { top: -1, left: -1, height: 0, width: 0 };
  private static isMousedown = false;
  private static didSendAppHide = false;

  private static pendingWindowRepositionSessionId: string;
  private static pendingShowSessionId: string;

  private static isShowingApp = false;
  private static isAppOnTop = false;

  private static lastWindowBoundsBySessionId: {
    [sessionId: string]: IBounds;
  } = {};

  public static getMaxChromeBounds(): IBounds | null {
    if (!this.workarea) return null;

    return {
      top: this.workarea.top,
      left: this.workarea.left,
      width: this.workarea.width,
      height: this.workarea.height,
    };
  }

  public static showApp(showApp: boolean, onTop?: boolean): void {
    if (this.isShowingApp !== showApp) {
      this.isShowingApp = showApp;
      if (showApp) {
        ChromeAliveCore.sendAppEvent('App.show');
        this.isAppOnTop = true;
      } else {
        ChromeAliveCore.sendAppEvent('App.hide');
        this.isAppOnTop = false;
      }
    }
    if (onTop !== undefined && onTop !== this.isAppOnTop) {
      this.isAppOnTop = onTop;
      ChromeAliveCore.sendAppEvent('App.onTop', onTop);
    }
  }

  public static showHeroSessionOnBounds(sessionId: string): void {
    this.pendingShowSessionId = sessionId;
  }

  public static onChromeWindowBoundsChanged(sessionId: string, bounds: IBounds): void {
    log.info('Chrome window bounds changed', { sessionId, bounds });
    this.lastWindowBoundsBySessionId[sessionId] = { ...bounds };

    const newBounds = { ...bounds };
    newBounds.top += this.chromeToolsHeight;

    const hasChanges =
      this.lastAppBounds.top !== newBounds.top ||
      this.lastAppBounds.left !== newBounds.left ||
      this.lastAppBounds.width !== newBounds.width ||
      this.lastAppBounds.height !== newBounds.height;

    if (this.isMousedown) {
      if (!this.didSendAppHide) {
        this.didSendAppHide = true;
        this.showApp(false);
      }

      if (hasChanges) this.pendingWindowRepositionSessionId = sessionId;
      return;
    }

    if ((!this.isMousedown && this.didSendAppHide) || this.pendingShowSessionId === sessionId) {
      this.didSendAppHide = false;
      this.pendingShowSessionId = null;
      this.showApp(true);
    }

    if (!hasChanges) return;

    this.lastAppBounds = newBounds;

    ChromeAliveCore.sendAppEvent('App.move', {
      bounds: {
        x: newBounds.left,
        y: newBounds.top,
        width: bounds.width,
        height: bounds.height,
      },
      item: 'timetravel',
    });
  }

  public static setMouseDown(isMousedown: boolean): void {
    this.isMousedown = isMousedown;
    if (!this.isMousedown && this.pendingWindowRepositionSessionId) {
      const sessionId = this.pendingWindowRepositionSessionId;
      this.pendingWindowRepositionSessionId = null;

      this.onChromeWindowBoundsChanged(sessionId, this.lastWindowBoundsBySessionId[sessionId]);
    }
  }

  public static onAppReady(workarea: IBounds): void {
    log.info('App workarea setup', { workarea, sessionId: null });
    this.workarea = workarea;
    const maxbounds = this.getMaxChromeBounds();
    defaultScreen.width = maxbounds.width;
    defaultScreen.height = maxbounds.height;
  }

  public static restartingSession(sessionId: string): void {
    // hide bar until page shows
    delete this.lastWindowBoundsBySessionId[sessionId];
    if (this.pendingWindowRepositionSessionId === sessionId) {
      this.pendingWindowRepositionSessionId = null;
      this.didSendAppHide = false;
    }
  }
}
