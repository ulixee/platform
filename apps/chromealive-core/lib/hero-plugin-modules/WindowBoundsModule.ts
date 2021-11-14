import { EventEmitter } from 'events';
import { IPuppetPage } from '@ulixee/hero-interfaces/IPuppetPage';
import { IBrowserEmulatorConfig, ISessionSummary } from '@ulixee/hero-interfaces/ICorePlugin';
import AliveBarPositioner from '../AliveBarPositioner';
import BridgeToExtension from '../bridges/BridgeToExtension';
import { IBounds } from '@ulixee/apps-chromealive-interfaces/IBounds';

export default class WindowBoundsModule {
  private sessionId: string;
  private bridgeToExtension: BridgeToExtension;

  constructor(bridgeToExtension: BridgeToExtension, browserEmitter: EventEmitter) {
    this.bridgeToExtension = bridgeToExtension;
    browserEmitter.on('payload', payload => {
      if (payload.event === 'OnBoundsChanged') {
        this.onBoundsChanged(payload);
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
    this.sessionId ??= sessionSummary.id;

    return Promise.all([
      page.devtoolsSession.send('Browser.getWindowForTarget').then(({ windowId, bounds }) => {
        AliveBarPositioner.onChromeWindowBoundsChanged(
          sessionSummary.id,
          windowId,
          bounds as IBounds,
        );
        const maxBounds = AliveBarPositioner.getMaxChromeBounds();
        if (!maxBounds) return;
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

  private onBoundsChanged(payload: any): void {
    const { windowId, ...bounds } = payload;
    AliveBarPositioner.onChromeWindowBoundsChanged(this.sessionId, windowId, bounds);
  }
}
