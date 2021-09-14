import { IBounds } from '@ulixee/apps-chromealive-interfaces/apis/IAppBoundsChangedApi';
import CorePlugin from '@ulixee/hero-plugin-utils/lib/CorePlugin';
import { IPuppetPage } from '@ulixee/hero-interfaces/IPuppetPage';
import { IBrowserEmulatorConfig, ISessionSummary } from '@ulixee/hero-interfaces/ICorePlugin';
import AliveBarPositioner from '../lib/AliveBarPositioner';

export default class WindowBoundsCorePlugin extends CorePlugin {
  public static id = '@ulixee/window-bounds-core-plugin';

  configure(options: IBrowserEmulatorConfig): Promise<any> | void {
    if ((options.viewport as any)?.isDefault) {
      const maxChromeBounds = AliveBarPositioner.getMaxChromeBounds();
      Object.assign(options.viewport, {
        width: 0,
        height: 0,
        deviceScaleFactor: 0,
        positionX: maxChromeBounds?.left,
        positionY: maxChromeBounds?.top,
        screenWidth: maxChromeBounds?.width,
        screenHeight: maxChromeBounds?.height,
        mobile: undefined,
      });
    }
  }

  onNewPuppetPage(page: IPuppetPage, sessionSummary: ISessionSummary): Promise<any> {
    if (!sessionSummary.options.showBrowser) return;
    return Promise.all([
      page.addPageCallback(
        '___onBoundsChanged',
        this.onBoundsChanged.bind(this, sessionSummary.id, page.id),
      ),
      page.devtoolsSession.send('Browser.getWindowForTarget').then(({ windowId, bounds }) => {
        AliveBarPositioner.onChromeWindowBoundsChanged(
          sessionSummary.id,
          windowId,
          bounds as IBounds,
        );
        const maxBounds = AliveBarPositioner.getMaxChromeBounds();
        if (maxBounds.height === bounds.height && maxBounds.width === bounds.width) return;

        return page.devtoolsSession.send('Browser.setWindowBounds', {
          windowId,
          bounds: {
            ...maxBounds,
            windowState: 'normal',
          },
        });
      }),
    ]);
  }

  onBoundsChanged(sessionId: string, puppetPageId: string, payload: string): void {
    const { windowId, ...bounds } = JSON.parse(payload);
    AliveBarPositioner.onChromeWindowBoundsChanged(sessionId, windowId, bounds);
  }
}
