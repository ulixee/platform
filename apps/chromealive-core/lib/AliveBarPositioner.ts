import IDevtoolsSession from '@ulixee/hero-interfaces/IDevtoolsSession';
import Log from '@ulixee/commons/lib/Logger';
import { IBounds } from '@ulixee/apps-chromealive-interfaces/IBounds';

const { log } = Log(module);

export default class AliveBarPositioner {
  public static getSessionDevtools: (sessionId: string) => IDevtoolsSession;

  private static workarea: IBounds;
  private static lastToolbarBounds: IBounds;
  private static loadedPage: string;
  private static hasPageChange = false;
  private static isFirstAdjustment = true;
  private static isMousedown = false;

  private static pendingWindowRepositionSessionId: string;

  private static lastWindowBoundsBySessionId: {
    [sessionId: string]: IBounds & { windowId: number };
  } = {};

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
  }

  public static onAppBoundsChanged(bounds: IBounds, page: string): void {
    log.info('App bounds changed', { bounds, sessionId: null });
    this.lastToolbarBounds = bounds;
    if (this.loadedPage !== page) {
      this.hasPageChange = true;
    }
    this.loadedPage = page;
    for (const sessionId of Object.keys(this.lastWindowBoundsBySessionId)) {
      this.alignWindowsIfOverlapping(sessionId);
    }
  }

  private static alignWindowsIfOverlapping(sessionId: string): void {
    const chromeBounds = this.lastWindowBoundsBySessionId[sessionId];
    let newBounds = this.getMaxChromeBounds();
    if (!newBounds || !this.getSessionDevtools) return;

    if (chromeBounds.top < newBounds.top || this.hasPageChange) {
      const devtools = this.getSessionDevtools(sessionId);
      if (!devtools) return;

      if (!this.isFirstAdjustment && !this.hasPageChange) {
        if (this.isMousedown) {
          log.info('App bounds changed, but appears to be drag. Ignoring');
          this.pendingWindowRepositionSessionId = sessionId;
          return;
        }
        newBounds = { top: newBounds.top } as any;
      }
      this.isFirstAdjustment = false;
      if (this.pendingWindowRepositionSessionId === sessionId) {
        this.pendingWindowRepositionSessionId = null;
      }
      this.hasPageChange = false;

      devtools
        .send('Browser.setWindowBounds', {
          windowId: chromeBounds.windowId,
          bounds: newBounds,
        })
        .catch(() => null);
    }
  }
}
