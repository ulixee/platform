import { IBounds } from '@ulixee/apps-chromealive-interfaces/apis/IAppBoundsChangedApi';
import Debug from 'debug';
import IDevtoolsSession from '@ulixee/hero-interfaces/IDevtoolsSession';

const debug = Debug('ulixee:chromealive');

export default class AliveBarPositioner {
  public static getSessionDevtools: (sessionId: string) => IDevtoolsSession;

  private static workarea: IBounds;
  private static lastToolbarBounds: IBounds;
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
    debug('Chrome window bounds changed', { sessionId, windowId, bounds });
    this.lastWindowBoundsBySessionId[sessionId] = { ...bounds, windowId };

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
    debug('App workarea setup', { workarea });
    this.workarea = workarea;
  }

  public static onAppBoundsChanged(bounds: IBounds): void {
    debug('App bounds changed', { bounds });
    this.lastToolbarBounds = bounds;
    for (const sessionId of Object.keys(this.lastWindowBoundsBySessionId)) {
      this.alignWindowsIfOverlapping(sessionId);
    }
  }

  private static alignWindowsIfOverlapping(sessionId: string): void {
    const chromeBounds = this.lastWindowBoundsBySessionId[sessionId];
    let newBounds = this.getMaxChromeBounds();
    if (!newBounds) return;

    if (chromeBounds.top < newBounds.top) {
      const devtools = this.getSessionDevtools(sessionId);
      if (!devtools) return;

      if (!this.isFirstAdjustment) {
        if (this.isMousedown) {
          debug('App bounds changed, but appears to be drag. Ignoring');
          this.pendingWindowRepositionSessionId = sessionId;
          return;
        }
        newBounds = { top: newBounds.top } as any;
      }
      this.isFirstAdjustment = false;
      if (this.pendingWindowRepositionSessionId === sessionId) {
        this.pendingWindowRepositionSessionId = null;
      }

      devtools
        .send('Browser.setWindowBounds', {
          windowId: chromeBounds.windowId,
          bounds: newBounds,
        })
        .catch(() => null);
    }
  }
}
