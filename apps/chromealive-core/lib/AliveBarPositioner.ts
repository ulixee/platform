import { IBounds } from '@ulixee/apps-chromealive-interfaces/apis/IAppBoundsChangedApi';
import Debug from 'debug';
import IDevtoolsSession from '@ulixee/hero-interfaces/IDevtoolsSession';

const debug = Debug('ulixee:chromealive');

export default class AliveBarPositioner {
  public static getSessionDevtools: (sessionId: string) => IDevtoolsSession;

  private static lastToolbarBounds: IBounds;
  private static workarea: IBounds;

  private static lastWindowBoundsBySessionId: {
    [sessionId: string]: IBounds & { windowId: number };
  } = {};

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
    const { top, height } = this.lastToolbarBounds;
    const toolbarBottom = top + height + 2;

    if (chromeBounds.top < toolbarBottom) {
      const devtools = this.getSessionDevtools(sessionId);
      if (!devtools) return;

      devtools
        .send('Browser.setWindowBounds', {
          windowId: chromeBounds.windowId,
          bounds: {
            top: toolbarBottom,
          },
        })
        .catch(() => null);
    }
  }
}
