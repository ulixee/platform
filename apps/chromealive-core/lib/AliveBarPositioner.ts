import { IBounds } from '@ulixee/apps-chromealive-interfaces/apis/IAppBoundsChangedApi';
import Debug from 'debug';
import IDevtoolsSession from '@ulixee/hero-interfaces/IDevtoolsSession';

const debug = Debug('ulixee:chromealive');

export default class AliveBarPositioner {
  public static getSessionDevtools: (sessionId: string) => IDevtoolsSession;

  private static workarea: IBounds;
  private static lastToolbarBounds: IBounds;
  private static isFirstAdjustment = true;

  private static lastWindowBoundsBySessionId: {
    [sessionId: string]: IBounds & { windowId: number };
  } = {};

  public static getMaxChromeBounds(): IBounds | null {
    if (!this.workarea || !this.lastToolbarBounds) return null;

    const { top, height } = this.lastToolbarBounds;
    const toolbarBottom = top + height + 1;
    return {
      top: toolbarBottom,
      left: this.lastToolbarBounds.left,
      width: this.lastToolbarBounds.width,
      height: this.workarea.height - this.lastToolbarBounds.height,
    };
  }

  public static onChromeWindowBoundsChanged(
    sessionId: string,
    windowId: number,
    bounds: IBounds,
  ): void {
    debug('Chrome window bounds changed', { sessionId, windowId, bounds });
    this.lastWindowBoundsBySessionId[sessionId] = { ...bounds, windowId };
    if (!this.lastToolbarBounds) return;

    this.alignWindowsIfOverlapping(sessionId);
  }

  public static onAppBoundsChanged(workarea: IBounds, toolbarBounds: IBounds): void {
    debug('App bounds changed', { workarea, toolbarBounds });
    this.lastToolbarBounds = toolbarBounds;
    this.workarea = workarea;
    for (const sessionId of Object.keys(this.lastWindowBoundsBySessionId)) {
      this.alignWindowsIfOverlapping(sessionId);
    }
  }

  private static alignWindowsIfOverlapping(sessionId: string): void {
    if (!this.lastToolbarBounds) return;

    const chromeBounds = this.lastWindowBoundsBySessionId[sessionId];
    let newBounds = this.getMaxChromeBounds();

    if (chromeBounds.top < newBounds.top) {
      const devtools = this.getSessionDevtools(sessionId);
      if (!devtools) return;

      if (!this.isFirstAdjustment) {
        newBounds = { top: newBounds.top } as any;
      }
      this.isFirstAdjustment = false;
      devtools
        .send('Browser.setWindowBounds', {
          windowId: chromeBounds.windowId,
          bounds: newBounds,
        })
        .catch(() => null);
    }
  }
}
