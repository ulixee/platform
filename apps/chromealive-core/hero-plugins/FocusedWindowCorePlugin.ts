import Debug from 'debug';
import CorePlugin from '@ulixee/hero-plugin-utils/lib/CorePlugin';
import { IPuppetPage } from '@ulixee/hero-interfaces/IPuppetPage';
import { ISessionSummary } from '@ulixee/hero-interfaces/ICorePlugin';
import * as Path from 'path';
import { waitForChromeExtension } from '../lib/activateChromeExtension';

const debug = Debug('ulixee:chromealive');

// have to resolve an actual file
const extensionPath = Path.resolve(__dirname, '..', 'chrome-extension').replace(
  'app.asar',
  'app.asar.unpacked',
); // make electron packaging friendly

export default class FocusedWindowCorePlugin extends CorePlugin {
  public static id = '@ulixee/focused-window-core-plugin';
  public static onVisibilityChange?: (sessionId: string, puppetPageId: string) => any;

  private static focusedPage: { sessionId: string; puppetPageId: string };

  onBrowserLaunchConfiguration(launchArguments: string[]): void {
    launchArguments.push(
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    );
  }

  onNewPuppetPage(page: IPuppetPage, sessionSummary: ISessionSummary): Promise<any> {
    if (!sessionSummary.options.showBrowser) return;
    const browserId = page.browserContext.browserId;

    page.once('close', () => this.onPageClosed(sessionSummary.id, page.id));

    return Promise.all([
      waitForChromeExtension(browserId),
      page.addPageCallback(
        '___onPageVisible',
        this.onPageVisible.bind(this, sessionSummary.id, page.id),
      ),
      page.addNewDocumentScript(
        `document.addEventListener('visibilitychange', function() {
    const state = document.visibilityState;
    if (state === 'visible') ___onPageVisible('');
  }, false)`,
        true,
      ),
    ]);
  }

  onPageVisible(sessionId: string, puppetPageId: string) {
    FocusedWindowCorePlugin.focusedPage = { sessionId, puppetPageId };
    debug('Page focused', { sessionId, puppetPageId });
    FocusedWindowCorePlugin.updateVisiblePage();
  }

  onPageClosed(sessionId: string, puppetPageId: string): void {
    const focused = FocusedWindowCorePlugin.focusedPage;
    if (!focused?.sessionId) return;

    if (focused.sessionId === sessionId && focused.puppetPageId === puppetPageId) {
      FocusedWindowCorePlugin.focusedPage = null;
    }

    FocusedWindowCorePlugin.updateVisiblePage();
  }

  static updateVisiblePage(): void {
    if (!this.onVisibilityChange) return;

    this.onVisibilityChange(this.focusedPage?.sessionId, this.focusedPage?.puppetPageId);
  }
}
