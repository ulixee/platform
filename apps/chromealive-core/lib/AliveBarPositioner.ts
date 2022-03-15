import Log from '@ulixee/commons/lib/Logger';
import { IBounds } from '@ulixee/apps-chromealive-interfaces/IBounds';
import { defaultScreen } from '@ulixee/default-browser-emulator/lib/Viewports';
import ChromeAliveCore from '../index';

const { log } = Log(module);

interface IBoundsAndScale extends IBounds {
  scale: number;
}

export default class AliveBarPositioner {
  public static workarea: IBoundsAndScale;
  public static chromeToolsTopPadding = 42;
  public static chromeToolsLeftPadding = 100;
  public static chromeToolsWidth = 140;

  private static lastAppBounds: IBounds = { top: -1, left: -1, height: 0, width: 0 };
  private static isMousedown = false;
  private static didSendAppHide = false;

  private static pendingWindowRepositionSessionId: string;
  private static pendingShowSessionId: string;

  private static isDraggingChrome = false;
  private static isAppOnTop = false;

  private static lastWindowBoundsBySessionId: {
    [sessionId: string]: IBounds;
  } = {};

  public static getMaxChromeBounds(): IBoundsAndScale | null {
    if (!this.workarea) return null;

    return {
      top: this.workarea.top,
      left: this.workarea.left,
      width: this.workarea.width,
      height: this.workarea.height,
      scale: this.workarea.scale,
    };
  }

  public static isDraggingMouse(isDraggingApp: boolean): void {
    if (this.isDraggingChrome !== isDraggingApp) {
      this.isDraggingChrome = isDraggingApp;
      if (isDraggingApp) {
        ChromeAliveCore.sendAppEvent('App.startedDraggingChrome');
      } else {
        ChromeAliveCore.sendAppEvent('App.stoppedDraggingChrome');
        this.isAppOnTop = true;
      }
    }
  }

  public static showApp(onTop = true): void {
    // app show puts app on top
    ChromeAliveCore.sendAppEvent('App.show', { onTop });
    this.isAppOnTop = onTop;
  }

  public static hideApp(): void {
    this.isDraggingChrome = false;
    this.isAppOnTop = false;
    ChromeAliveCore.sendAppEvent('App.hide');
  }

  public static showHeroSessionOnBounds(sessionId: string): void {
    this.pendingShowSessionId = sessionId;
  }

  public static onChromeWindowBoundsChanged(sessionId: string, bounds: IBounds): void {
    log.info('Chrome window bounds changed', { sessionId, bounds });
    this.lastWindowBoundsBySessionId[sessionId] = { ...bounds };

    const newBounds = { ...bounds };
    newBounds.top += this.chromeToolsTopPadding;
    newBounds.left += this.chromeToolsLeftPadding;
    newBounds.width -= this.chromeToolsWidth;

    const hasChanges =
      this.lastAppBounds.top !== newBounds.top ||
      this.lastAppBounds.left !== newBounds.left ||
      this.lastAppBounds.width !== newBounds.width ||
      this.lastAppBounds.height !== newBounds.height;

    if (this.isMousedown) {
      if (!this.didSendAppHide) {
        this.didSendAppHide = true;
        this.isDraggingMouse(true);
      }

      if (hasChanges) this.pendingWindowRepositionSessionId = sessionId;
      return;
    }

    if ((!this.isMousedown && this.didSendAppHide) || this.pendingShowSessionId === sessionId) {
      this.didSendAppHide = false;
      this.pendingShowSessionId = null;
      this.isDraggingMouse(false);
    }

    if (!hasChanges) return;

    this.lastAppBounds = newBounds;

    ChromeAliveCore.sendAppEvent('App.moveTo', {
      bounds: {
        x: newBounds.left,
        y: newBounds.top,
        width: newBounds.width,
        height: bounds.height,
      },
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

  public static onAppReady(workarea: IBoundsAndScale): void {
    this.workarea = workarea;
    const maxbounds = this.getMaxChromeBounds();

    defaultScreen.width = maxbounds.width;
    defaultScreen.height = maxbounds.height;
    defaultScreen.scale = maxbounds.scale;
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
