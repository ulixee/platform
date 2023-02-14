import { CorePluginClassDecorator, ISessionSummary } from '@ulixee/hero-interfaces/ICorePlugin';
import CorePlugin from '@ulixee/hero-plugin-utils/lib/CorePlugin';
import IViewport from '@ulixee/unblocked-specification/agent/browser/IViewport';
import { Page } from '@ulixee/unblocked-agent';
import IEmulationProfile from '@ulixee/unblocked-specification/plugin/IEmulationProfile';
import Workarea from './Workarea';

@CorePluginClassDecorator
export default class FullscreenHeroCorePlugin extends CorePlugin {
  public static override id = '@ulixee/fullscreen-hero-core-plugin';

  public configure(options: IEmulationProfile): Promise<any> | void {
    if ((options.viewport as any)?.isDefault) {
      Object.assign(options.viewport, this.getMaxChromeViewport());
    }
  }

  public async onNewPage(page: Page): Promise<any> {
    const { windowId, bounds } = await page.devtoolsSession.send('Browser.getWindowForTarget');

    const maxBounds = Workarea.getMaxChromeBounds();
    if (!maxBounds) return;
    if (maxBounds.height === bounds.height && maxBounds.width === bounds.width) return;

    await page.devtoolsSession.send('Browser.setWindowBounds', {
      windowId,
      bounds: {
        ...maxBounds,
        windowState: 'normal',
      },
    });
  }

  private getMaxChromeViewport(): IViewport {
    const maxChromeBounds = Workarea.getMaxChromeBounds();
    return {
      width: 0,
      height: 0,
      deviceScaleFactor: 0,
      positionX: maxChromeBounds?.left,
      positionY: maxChromeBounds?.top,
      screenWidth: maxChromeBounds?.width,
      screenHeight: maxChromeBounds?.height,
      mobile: undefined,
    } as IViewport;
  }

  public static shouldActivate(profile: IEmulationProfile, session: ISessionSummary): boolean {
    return session.options.showChromeAlive === true;
  }
}
