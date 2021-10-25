import { IBounds } from '@ulixee/apps-chromealive-interfaces/apis/IAppBoundsChangedApi';
import { IPuppetPage } from '@ulixee/hero-interfaces/IPuppetPage';
import { IBrowserEmulatorConfig, ISessionSummary } from '@ulixee/hero-interfaces/ICorePlugin';
import AliveBarPositioner from '../AliveBarPositioner';

export default class WindowBoundsModule {
  private sessionId: string;

  constructor(bridgeToExtensionContent) {
    bridgeToExtensionContent.on('message', message => {
      if (message.event === 'OnBoundsChanged') {
        this.onBoundsChanged(message);
      }
    });
  }

  public configure(options: IBrowserEmulatorConfig): void {
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

  public onNewPuppetPage(page: IPuppetPage, sessionSummary: ISessionSummary): Promise<any> {
    if (!sessionSummary.options.showBrowser) return;
    this.sessionId ??= sessionSummary.id;

    return Promise.all([
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

  private onBoundsChanged(payload: string): void {
    const { windowId, ...bounds } = JSON.parse(payload);
    AliveBarPositioner.onChromeWindowBoundsChanged(this.sessionId, windowId, bounds);
  }
}
