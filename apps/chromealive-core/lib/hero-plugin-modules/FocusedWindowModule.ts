import { IPuppetPage } from '@ulixee/hero-interfaces/IPuppetPage';
import { ISessionSummary } from '@ulixee/hero-interfaces/ICorePlugin';

export default class FocusedWindowModule {
  private sessionId: string;

  constructor(bridgeToExtensionContent) {
    bridgeToExtensionContent.on('message', (message, pageId) => {
      if (message.event === 'OnPageVisible') {
        this.onPageVisible(pageId, message);
      }
    });
  }

  onNewPuppetPage(page: IPuppetPage, sessionSummary: ISessionSummary): Promise<any> {
    if (!sessionSummary.options.showBrowser) return;
    this.sessionId ??= sessionSummary.id;

    page.once('close', () => this.onPageClosed(page.id));

    return Promise.all([
      page.devtoolsSession.send('Emulation.setFocusEmulationEnabled', { enabled: false }),
      page.addNewDocumentScript(
        `document.addEventListener('visibilitychange', function() {
    const state = document.visibilityState;
    if (state === 'visible') ___onPageVisible('{ "focused": true, "active": true }');
  }, false)`,
        true,
      ),
    ]);
  }

  onPageVisible(puppetPageId: string, statusJson: string) {
    const status = JSON.parse(statusJson ?? '{}');
    FocusedWindowModule.onVisibilityChange(
      { active: true, focused: status.focused },
      this.sessionId,
      puppetPageId,
    );
  }

  onPageClosed(puppetPageId: string): void {
    FocusedWindowModule.onVisibilityChange(
      { active: false, focused: false },
      this.sessionId,
      puppetPageId,
    );
  }

  public static onVisibilityChange: (
    status: { focused: boolean; active: boolean },
    sessionId: string,
    puppetPageId: string,
  ) => any = () => null;
}
