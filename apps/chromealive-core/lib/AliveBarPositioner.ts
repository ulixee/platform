import Log from '@ulixee/commons/lib/Logger';
import { IBounds } from '@ulixee/apps-chromealive-interfaces/IBounds';
import { defaultScreen } from '@ulixee/default-browser-emulator/lib/Viewports';
import ChromeAliveCore from '../index';

const { log } = Log(module);

export default class AliveBarPositioner {
  public static workarea: IBounds;
  private static lastToolbarBounds: IBounds;
  private static loadedPage: string;
  private static hasChromeAliveModeChange = false;
  private static isMousedown = false;

  private static pendingWindowRepositionSessionId: string;

  private static lastWindowBoundsBySessionId: {
    [sessionId: string]: IBounds & { windowId: number };
  } = {};

  private static sessionIdsWithBoundsAdjusted = new Set<string>();

  public static getMaxChromeBounds(): IBounds | null {
    if (!this.workarea) return null;

    const toolbarHeight = this.lastToolbarBounds?.height ?? 50;
    return {
      top: this.workarea.top + toolbarHeight,
      left: this.workarea.left,
      width: this.workarea.width,
      height: this.workarea.height - toolbarHeight,
    };
  }

  public static onChromeWindowBoundsChanged(
    sessionId: string,
    windowId: number,
    bounds: IBounds,
  ): void {
    log.info('Chrome window bounds changed', { sessionId, windowId, bounds });
    this.lastWindowBoundsBySessionId[sessionId] ??= { windowId, modeChange: false } as any;
    Object.assign(this.lastWindowBoundsBySessionId[sessionId], bounds);

    this.alignWindowsIfOverlapping(sessionId);
  }

  public static setMouseDown(isMousedown: boolean): void {
    this.isMousedown = isMousedown;
    if (!this.isMousedown && this.pendingWindowRepositionSessionId) {
      this.alignWindowsIfOverlapping(this.pendingWindowRepositionSessionId);
      this.pendingWindowRepositionSessionId = null;
    }
  }

  public static onAppReady(workarea: IBounds): void {
    log.info('App workarea setup', { workarea, sessionId: null });
    this.workarea = workarea;
    const maxbounds = this.getMaxChromeBounds();
    defaultScreen.width = maxbounds.width;
    defaultScreen.height = maxbounds.height;
  }

  public static onAppBoundsChanged(bounds: IBounds, page: string): void {
    log.info('App bounds changed', { bounds, sessionId: null });
    this.lastToolbarBounds = bounds;
    if (this.loadedPage !== page) {
      this.hasChromeAliveModeChange = true;
    }
    this.loadedPage = page;
    for (const sessionId of Object.keys(this.lastWindowBoundsBySessionId)) {
      this.alignWindowsIfOverlapping(sessionId);
    }
  }

  public static restartingSession(sessionId:string) :void {
    this.sessionIdsWithBoundsAdjusted.delete(sessionId);
    delete this.lastWindowBoundsBySessionId[sessionId];
  }

  private static alignWindowsIfOverlapping(sessionId: string): void {
    const chromeBounds = this.lastWindowBoundsBySessionId[sessionId];
    let newBounds = this.getMaxChromeBounds();
    const heroSession = ChromeAliveCore.sessionObserversById.get(sessionId)?.heroSession;
    if (!newBounds || !heroSession) return;

    if (chromeBounds.top < newBounds.top || this.hasChromeAliveModeChange) {
      const isFirstAdjustment = !this.sessionIdsWithBoundsAdjusted.has(sessionId);
      const devtools = [...heroSession.tabsById.values()].find(x => !x.isClosing)?.puppetPage
        ?.devtoolsSession;
      if (!devtools) {
        if (isFirstAdjustment) {
          heroSession.once('tab-created', this.alignWindowsIfOverlapping.bind(this, sessionId));
        }
        return;
      }

      if (!isFirstAdjustment && !this.hasChromeAliveModeChange) {
        if (this.isMousedown) {
          this.pendingWindowRepositionSessionId = sessionId;
          return;
        }
        newBounds = { top: newBounds.top } as any;
      }
      this.sessionIdsWithBoundsAdjusted.add(sessionId);
      if (this.pendingWindowRepositionSessionId === sessionId) {
        this.pendingWindowRepositionSessionId = null;
      }
      this.hasChromeAliveModeChange = false;

      devtools
        .send('Browser.setWindowBounds', {
          windowId: chromeBounds.windowId,
          bounds: newBounds,
        })
        .catch(() => null);
    }
  }
}
