import Log from '@ulixee/commons/lib/Logger';
import { IBounds } from '@ulixee/apps-chromealive-interfaces/IBounds';
import { defaultScreen } from '@unblocked-web/default-browser-emulator/lib/Viewports';
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

  private static focusedPagesById = new Map<string, boolean>();
  private static focusedDevtoolsById = new Map<string, boolean>();
  private static isDraggingChrome = false;

  private static get isAppShowing(): boolean {
    for (const value of this.focusedDevtoolsById.values()) if (value) return true;
    for (const value of this.focusedPagesById.values()) if (value) return true;
    return false;
  }

  private static lastVisibility = {
    showing: false,
    hasDelayedHide: false,
    sendTime: -1,
    sendTimeout: null as NodeJS.Timeout,
  };

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
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public static setDevtoolsFocused(pageId: string, focused: boolean, dockSide: string): void {
    this.focusedDevtoolsById.set(pageId, focused);
    this.syncAppVisibility();
  }

  public static focusedPageId(pageId: string): void {
    // app show puts app on top
    this.focusedPagesById.set(pageId, true);
    this.syncAppVisibility();
  }

  public static resetSession(heroSessionId?: string): void {
    this.focusedDevtoolsById.clear();
    this.focusedPagesById.clear();
    if (heroSessionId) {
      delete this.lastWindowBoundsBySessionId[heroSessionId];
    } else {
      this.lastWindowBoundsBySessionId = {};
    }
    this.syncAppVisibility();
  }

  public static blurredPageId(pageId: string): void {
    this.focusedPagesById.set(pageId, false);
    this.isDraggingChrome = false;
    this.syncAppVisibility();
  }

  public static syncAppVisibility(isDelay = false): void {
    const isShowing = this.isAppShowing;

    if (!isShowing && this.isMousedown) {
      return;
    }

    let msToDelay: number;
    // if not showing, wait for 500 ms
    if (this.lastVisibility.showing === true && !isShowing) {
      if (isDelay) msToDelay = 0;
      else {
        if (this.lastVisibility.hasDelayedHide) return;
        this.lastVisibility.hasDelayedHide = true;

        msToDelay = 500;
      }
    } else {
      msToDelay = Date.now() - this.lastVisibility.sendTime;
      if (msToDelay > 100) msToDelay = -1;
    }

    clearTimeout(this.lastVisibility.sendTimeout);
    this.lastVisibility.sendTimeout = null;
    if (msToDelay > 0) {
      this.lastVisibility.sendTimeout = setTimeout(
        this.syncAppVisibility.bind(this, true),
        msToDelay,
      );
      return;
    }

    this.lastVisibility.hasDelayedHide = false;

    if (this.lastVisibility.showing === isShowing) {
      return;
    }

    this.lastVisibility.showing = isShowing;
    this.lastVisibility.sendTime = Date.now();
    if (isShowing) {
      ChromeAliveCore.sendAppEvent('App.show');
    } else {
      ChromeAliveCore.sendAppEvent('App.hide');
    }
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
    if (!this.isMousedown) this.syncAppVisibility();
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
