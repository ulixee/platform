import CorePlugin from '@ulixee/hero-plugin-utils/lib/CorePlugin';
import { IPuppetPage } from '@ulixee/hero-interfaces/IPuppetPage';
import { ISessionSummary } from '@ulixee/hero-interfaces/ICorePlugin';
import * as Path from 'path';

// have to resolve an actual file
const extensionPath = Path.resolve(__dirname, '..', 'chrome-extension').replace(
  'app.asar',
  'app.asar.unpacked',
); // make electron packaging friendly

export default class FocusedWindowCorePlugin extends CorePlugin {
  public static id = '@ulixee/focused-window-core-plugin';
  onBrowserLaunchConfiguration(launchArguments: string[]): void {
    launchArguments.push(
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    );
  }

  onNewPuppetPage(page: IPuppetPage, sessionSummary: ISessionSummary): Promise<any> {
    if (!sessionSummary.options.showBrowser) return;

    page.once('close', () => this.onPageClosed(sessionSummary.id, page.id));

    return Promise.all([
      page.devtoolsSession.send('Emulation.setFocusEmulationEnabled', { enabled: false }),
      page.addPageCallback(
        '___onPageVisible',
        this.onPageVisible.bind(this, sessionSummary.id, page.id),
      ),
      page.addNewDocumentScript(
        `document.addEventListener('visibilitychange', function() {
    const state = document.visibilityState;
    if (state === 'visible') ___onPageVisible('{ "focused": true, "active": true }');
  }, false)`,
        true,
      ),
    ]);
  }

  onPageVisible(sessionId: string, puppetPageId: string, statusJson: string) {
    const status = JSON.parse(statusJson ?? '{}');
    FocusedWindowCorePlugin.onVisibilityChange(
      { active: true, focused: status.focused },
      sessionId,
      puppetPageId,
    );
  }

  onPageClosed(sessionId: string, puppetPageId: string): void {
    FocusedWindowCorePlugin.onVisibilityChange(
      { active: false, focused: false },
      sessionId,
      puppetPageId,
    );
  }

  public static onVisibilityChange: (
    status: { focused: boolean; active: boolean },
    sessionId: string,
    puppetPageId: string,
  ) => any = () => null;
}
