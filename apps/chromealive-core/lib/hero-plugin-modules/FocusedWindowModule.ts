import { IPuppetPage } from '@ulixee/hero-interfaces/IPuppetPage';
import { ISessionSummary } from '@ulixee/hero-interfaces/ICorePlugin';
import { EventEmitter } from "events";
import BridgeToExtension from '../bridges/BridgeToExtension';

export default class FocusedWindowModule {
  private sessionId: string;
  private bridgeToExtension: BridgeToExtension;

  constructor(bridgeToExtension: BridgeToExtension, browserEmitter: EventEmitter) {
    this.bridgeToExtension = bridgeToExtension;
    browserEmitter.on('payload', (payload, puppetPageId) => {
      if (payload.event === 'OnPageVisible') {
        this.handlePageIsVisible(payload, puppetPageId);
      }
    });
  }

  public onNewPuppetPage(page: IPuppetPage, sessionSummary: ISessionSummary): Promise<any> {
    if (!sessionSummary.options.showBrowser) return;
    this.sessionId ??= sessionSummary.id;

    page.once('close', () => this.handlePageIsClosed(page.id));

    return Promise.all([
      page.devtoolsSession.send('Emulation.setFocusEmulationEnabled', { enabled: false }),
    ]);
  }

  private handlePageIsVisible(payload: any, puppetPageId: string) {
    FocusedWindowModule.onVisibilityChange(
      { active: true, focused: payload.focused },
      this.sessionId,
      puppetPageId,
    );
  }

  private handlePageIsClosed(puppetPageId: string): void {
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
